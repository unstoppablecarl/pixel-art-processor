import {
  type Color32,
  forEachLinePoint,
  type PaintAlphaMask,
  type PaintBinaryMask,
  type PaintRect,
  type Rect,
  trimRectBounds,
} from 'pixel-data-js'
import type { CanvasEditToolStore } from '../../../../lib/store/canvas-edit-tool-store.ts'
import type { TileId, WangTile } from '../../../../lib/wang-tiles/WangTileset.ts'
import type { TileGridEditorState } from '../../TileGridEditorState.ts'
import type { TileSheetPaintBuffer, TileSheetPaintBufferTile } from './TileSheetPaintBuffer.ts'

export class GridToTileSheetPaintBuffer {
  scratchBounds: Rect = {
    x: 0,
    y: 0,
    w: 0,
    h: 0,
  }

  scratchAffectedTileIds: TileId[] = []

  constructor(
    protected store: CanvasEditToolStore,
    public tileSheetPaintBuffer: TileSheetPaintBuffer,
    protected state: TileGridEditorState,
  ) {
  }

  private createFastMirrorPixel(
    tileId: TileId,
    tileSize: number,
    affectedTileIds: TileId[],
  ) {
    if (!this.store.duplicateTileEdges) return null

    const paintBuffer = this.tileSheetPaintBuffer
    const tileset = this.state.tileset
    const wangTile = tileset.byId.get(tileId)

    if (!wangTile) return null

    const nEdge = tileset.getTilesWithSameEdge(wangTile, 'N')
    const sEdge = tileset.getTilesWithSameEdge(wangTile, 'S')
    const wEdge = tileset.getTilesWithSameEdge(wangTile, 'W')
    const eEdge = tileset.getTilesWithSameEdge(wangTile, 'E')

    const borderThickness = this.store.duplicateTileEdgesBorderThickness
    const max = tileSize - 1

    return (localX: number, localY: number, newColor: Color32) => {
      const isNorth = localY < borderThickness
      const isSouth = localY > max - borderThickness
      const isWest = localX < borderThickness
      const isEast = localX > max - borderThickness

      if (!isNorth && !isSouth && !isWest && !isEast) return

      const copyToEdge = (
        destTiles: readonly WangTile<number>[],
        isMirrored: boolean,
        edgeType: 'N' | 'S' | 'E' | 'W',
      ) => {
        const len = destTiles.length

        for (let i = 0; i < len; i++) {
          const destId = destTiles[i].id
          const destBuffer = paintBuffer.get(destId)

          let dx = localX
          let dy = localY

          if (isMirrored) {
            if (edgeType === 'N' || edgeType === 'S') {
              dy = max - localY
            } else {
              dx = max - localX
            }
          }

          const pIdx = dy * destBuffer.w + dx
          destBuffer.data[pIdx] = newColor

          if (!affectedTileIds.includes(destId)) {
            affectedTileIds.push(destId)
          }
        }
      }

      if (isNorth) {
        copyToEdge(nEdge.sameEdge, false, 'N')
        copyToEdge(nEdge.mirroredEdge, true, 'N')
      }

      if (isSouth) {
        copyToEdge(sEdge.sameEdge, false, 'S')
        copyToEdge(sEdge.mirroredEdge, true, 'S')
      }

      if (isWest) {
        copyToEdge(wEdge.sameEdge, false, 'W')
        copyToEdge(wEdge.mirroredEdge, true, 'W')
      }

      if (isEast) {
        copyToEdge(eEdge.sameEdge, false, 'E')
        copyToEdge(eEdge.mirroredEdge, true, 'E')
      }
    }
  }

  paintAlphaMask(
    color: Color32,
    brush: PaintAlphaMask,
    x: number,
    y: number,
  ): TileId[]
  paintAlphaMask(
    color: Color32,
    brush: PaintAlphaMask,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
  ): TileId[]
  paintAlphaMask(
    color: Color32,
    brush: PaintAlphaMask,
    x0: number,
    y0: number,
    x1: number = x0,
    y1: number = y0,
  ): TileId[] {
    const cA = color >>> 24
    const affectedTileIds = this.scratchAffectedTileIds
    affectedTileIds.length = 0
    if (cA === 0) return affectedTileIds

    const tileSize = this.state.tileSize
    const grid = this.state.tileGrid
    const targetW = grid.width * tileSize
    const targetH = grid.height * tileSize
    const scratch = this.scratchBounds

    const bW = brush.w
    const bH = brush.h
    const bD = brush.data
    const centerOffsetX = brush.centerOffsetX
    const centerOffsetY = brush.centerOffsetY

    const cRGB = color & 0x00ffffff

    forEachLinePoint(
      x0,
      y0,
      x1,
      y1,
      (px, py) => {
        const topLeftX = Math.floor(px + centerOffsetX)
        const topLeftY = Math.floor(py + centerOffsetY)

        trimRectBounds(
          topLeftX,
          topLeftY,
          bW,
          bH,
          targetW,
          targetH,
          scratch,
        )

        if (scratch.w <= 0 || scratch.h <= 0) return

        this.eachTile(
          scratch,
          (tile, tileLeft, tileTop, bX, bY, bW_t, bH_t) => {
            let tileChanged = false

            const d32 = tile.data
            const fastMirrorPixel = this.createFastMirrorPixel(
              tile.tileId,
              tileSize,
              affectedTileIds,
            )

            for (let i = 0; i < bH_t; i++) {
              const canvasY = bY + i
              const bOff = (canvasY - topLeftY) * bW
              const localY = canvasY - tileTop
              const dS = localY * tileSize + (bX - tileLeft)

              for (let j = 0; j < bW_t; j++) {
                const brushA = bD[bOff + (bX + j - topLeftX)]
                if (brushA === 0) continue

                const t = cA * brushA + 128
                const blendedA = (t + (t >> 8)) >> 8

                const idx = dS + j
                const cur = d32[idx]

                if (brushA > (cur >>> 24)) {
                  const next = (cRGB | (blendedA << 24)) >>> 0

                  if (cur !== next) {
                    const nextColor = next as Color32
                    d32[idx] = nextColor
                    tileChanged = true

                    if (fastMirrorPixel) {
                      const localX = bX - tileLeft + j
                      fastMirrorPixel(localX, localY, nextColor)
                    }
                  }
                }
              }
            }

            if (tileChanged) {
              if (!affectedTileIds.includes(tile.tileId)) {
                affectedTileIds.push(tile.tileId)
              }
            }
          },
        )
      },
    )

    return affectedTileIds
  }

  paintBinaryMask(
    color: Color32,
    brush: PaintBinaryMask,
    x: number,
    y: number,
  ): TileId[]
  paintBinaryMask(
    color: Color32,
    brush: PaintBinaryMask,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
  ): TileId[]
  paintBinaryMask(
    color: Color32,
    brush: PaintBinaryMask,
    x0: number,
    y0: number,
    x1: number = x0,
    y1: number = y0,
  ): TileId[] {
    const affectedTileIds = this.scratchAffectedTileIds
    affectedTileIds.length = 0
    if ((color >>> 24) === 0) return affectedTileIds

    const tileSize = this.state.tileSize
    const grid = this.state.tileGrid
    const targetW = grid.width * tileSize
    const targetH = grid.height * tileSize
    const scratch = this.scratchBounds

    const bW = brush.w
    const bH = brush.h
    const bD = brush.data
    const centerOffsetX = brush.centerOffsetX
    const centerOffsetY = brush.centerOffsetY

    forEachLinePoint(
      x0,
      y0,
      x1,
      y1,
      (px, py) => {
        const topLeftX = Math.floor(px + centerOffsetX)
        const topLeftY = Math.floor(py + centerOffsetY)

        trimRectBounds(
          topLeftX,
          topLeftY,
          bW,
          bH,
          targetW,
          targetH,
          scratch,
        )

        if (scratch.w <= 0 || scratch.h <= 0) return

        this.eachTile(
          scratch,
          (tile, tileLeft, tileTop, bX, bY, bW_t, bH_t) => {
            let tileChanged = false

            const d32 = tile.data
            const fastMirrorPixel = this.createFastMirrorPixel(
              tile.tileId,
              tileSize,
              affectedTileIds,
            )

            for (let i = 0; i < bH_t; i++) {
              const canvasY = bY + i
              const bOff = (canvasY - topLeftY) * bW
              const localY = canvasY - tileTop
              const dS = localY * tileSize + (bX - tileLeft)

              for (let j = 0; j < bW_t; j++) {
                if (!bD[bOff + (bX + j - topLeftX)]) continue

                const idx = dS + j

                if (d32[idx] !== color) {
                  d32[idx] = color
                  tileChanged = true

                  if (fastMirrorPixel) {
                    const localX = bX - tileLeft + j
                    fastMirrorPixel(localX, localY, color)
                  }
                }
              }
            }

            if (tileChanged) {
              if (!affectedTileIds.includes(tile.tileId)) {
                affectedTileIds.push(tile.tileId)
              }
            }
          },
        )
      },
    )

    return affectedTileIds
  }

  paintRect(
    color: Color32,
    brush: PaintRect,
    x: number,
    y: number,
  ): TileId[]
  paintRect(
    color: Color32,
    brush: PaintRect,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
  ): TileId[]
  paintRect(
    color: Color32,
    brush: PaintRect,
    x0: number,
    y0: number,
    x1: number = x0,
    y1: number = y0,
  ): TileId[] {
    const affectedTileIds = this.scratchAffectedTileIds
    affectedTileIds.length = 0
    if ((color >>> 24) === 0) return affectedTileIds

    const tileSize = this.state.tileSize
    const grid = this.state.tileGrid
    const targetW = grid.width * tileSize
    const targetH = grid.height * tileSize
    const scratch = this.scratchBounds

    const bW = brush.w
    const bH = brush.h
    const centerOffsetX = brush.centerOffsetX
    const centerOffsetY = brush.centerOffsetY

    forEachLinePoint(
      x0,
      y0,
      x1,
      y1,
      (px, py) => {
        const topLeftX = Math.floor(px + centerOffsetX)
        const topLeftY = Math.floor(py + centerOffsetY)

        trimRectBounds(
          topLeftX,
          topLeftY,
          bW,
          bH,
          targetW,
          targetH,
          scratch,
        )

        if (scratch.w <= 0 || scratch.h <= 0) return

        this.eachTile(
          scratch,
          (tile, tileLeft, tileTop, bX, bY, bW_t, bH_t) => {
            let tileChanged = false

            const d32 = tile.data
            const fastMirrorPixel = this.createFastMirrorPixel(
              tile.tileId,
              tileSize,
              affectedTileIds,
            )

            for (let i = 0; i < bH_t; i++) {
              const canvasY = bY + i
              const localY = canvasY - tileTop
              const dS = localY * tileSize + (bX - tileLeft)

              for (let j = 0; j < bW_t; j++) {
                const idx = dS + j

                if (d32[idx] !== color) {
                  d32[idx] = color
                  tileChanged = true

                  if (fastMirrorPixel) {
                    const localX = bX - tileLeft + j
                    fastMirrorPixel(localX, localY, color)
                  }
                }
              }
            }

            if (tileChanged) {
              if (!affectedTileIds.includes(tile.tileId)) {
                affectedTileIds.push(tile.tileId)
              }
            }
          },
        )
      },
    )

    return affectedTileIds
  }

  private eachTile(
    bounds: Rect,
    callback: (
      tile: TileSheetPaintBufferTile,
      tileLeft: number,
      tileTop: number,
      bX: number,
      bY: number,
      bW: number,
      bH: number,
    ) => void,
  ): void {
    const tileSize = this.state.tileSize
    const grid = this.state.tileGrid

    const txMin = Math.max(0, Math.floor(bounds.x / tileSize))
    const tyMin = Math.max(0, Math.floor(bounds.y / tileSize))
    const txMax = Math.min(grid.width - 1, Math.floor((bounds.x + bounds.w - 1) / tileSize))
    const tyMax = Math.min(grid.height - 1, Math.floor((bounds.y + bounds.h - 1) / tileSize))

    if (txMin > txMax || tyMin > tyMax) return

    for (let ty = tyMin; ty <= tyMax; ty++) {
      const tileTop = ty * tileSize

      for (let tx = txMin; tx <= txMax; tx++) {
        const wangTile = grid.get(tx, ty)
        if (!wangTile) continue

        const tile = this.tileSheetPaintBuffer.tiles[wangTile.id]
        if (!tile) continue

        const tileLeft = tx * tileSize

        const bX = Math.max(bounds.x, tileLeft)
        const bY = Math.max(bounds.y, tileTop)
        const bW = Math.min(bounds.x + bounds.w, tileLeft + tileSize) - bX
        const bH = Math.min(bounds.y + bounds.h, tileTop + tileSize) - bY

        callback(
          tile,
          tileLeft,
          tileTop,
          bX,
          bY,
          bW,
          bH,
        )
      }
    }
  }
}