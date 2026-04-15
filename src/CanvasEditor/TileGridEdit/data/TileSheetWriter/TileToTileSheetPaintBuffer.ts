import {
  type Color32,
  forEachLinePoint,
  type PaintAlphaMask,
  type PaintBinaryMask,
  type PaintRect,
} from 'pixel-data-js'
import type { CanvasEditToolStore } from '../../../../lib/store/canvas-edit-tool-store.ts'
import type { TileId, WangTile, WangTileset } from '../../../../lib/wang-tiles/WangTileset.ts'
import type { TileGridEditorState } from '../../TileGridEditorState.ts'
import type { TileSheetPaintBuffer } from './TileSheetPaintBuffer.ts'

export class TileToTileSheetPaintBuffer {
  protected tileset: WangTileset<number>

  constructor(
    protected store: CanvasEditToolStore,
    public tileSheetPaintBuffer: TileSheetPaintBuffer,
    protected state: TileGridEditorState,
  ) {
    this.tileset = state.tileset
  }

  private createFastMirrorPixel(tileId: TileId, targetW: number) {
    if (!this.store.duplicateTileEdges) return null

    const paintBuffer = this.tileSheetPaintBuffer
    const tileset = this.tileset
    const wangTile = tileset.byId.get(tileId)

    if (!wangTile) return null

    const nEdge = tileset.getTilesWithSameEdge(wangTile, 'N')
    const sEdge = tileset.getTilesWithSameEdge(wangTile, 'S')
    const wEdge = tileset.getTilesWithSameEdge(wangTile, 'W')
    const eEdge = tileset.getTilesWithSameEdge(wangTile, 'E')

    const borderThickness = this.store.duplicateTileEdgesBorderThickness
    const max = targetW - 1

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
    tileId: TileId,
    color: Color32,
    brush: PaintAlphaMask,
    x: number,
    y: number,
  ): boolean
  paintAlphaMask(
    tileId: TileId,
    color: Color32,
    brush: PaintAlphaMask,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
  ): boolean
  paintAlphaMask(
    tileId: TileId,
    color: Color32,
    brush: PaintAlphaMask,
    x0: number,
    y0: number,
    x1: number = x0,
    y1: number = y0,
  ): boolean {
    const cA = color >>> 24
    if (cA === 0) return false

    const tile = this.tileSheetPaintBuffer.get(tileId)
    const targetW = tile.w
    const targetH = tile.h

    const maskW = brush.w
    const maskH = brush.h
    const maskData = brush.data
    const centerOffsetX = brush.centerOffsetX
    const centerOffsetY = brush.centerOffsetY

    const cRGB = color & 0x00ffffff
    const dst32 = tile.data
    const fastMirrorPixel = this.createFastMirrorPixel(tileId, targetW)

    let hasChanged = false

    forEachLinePoint(
      x0,
      y0,
      x1,
      y1,
      (px, py) => {
        const topLeftX = Math.floor(px + centerOffsetX)
        const topLeftY = Math.floor(py + centerOffsetY)

        let dstX = topLeftX
        let dstY = topLeftY
        let actualW = maskW
        let actualH = maskH

        if (dstX < 0) {
          actualW += dstX
          dstX = 0
        }

        if (dstY < 0) {
          actualH += dstY
          dstY = 0
        }

        actualW = Math.min(actualW, targetW - dstX)
        actualH = Math.min(actualH, targetH - dstY)

        if (actualW <= 0 || actualH <= 0) return

        const mx = dstX - topLeftX
        const my = dstY - topLeftY

        let dIdx = dstY * targetW + dstX
        let mIdx = my * maskW + mx

        const dStride = targetW - actualW
        const mStride = maskW - actualW

        for (let iy = 0; iy < actualH; iy++) {
          const localY = dstY + iy

          for (let ix = 0; ix < actualW; ix++) {
            const localX = dstX + ix
            const brushA = maskData[mIdx]

            if (brushA !== 0) {
              const t = cA * brushA + 128
              const blendedA = (t + (t >> 8)) >> 8
              const cur = dst32[dIdx]

              if (brushA > (cur >>> 24)) {
                const next = (cRGB | (blendedA << 24)) >>> 0

                if (cur !== next) {
                  const nextColor = next as Color32
                  dst32[dIdx] = nextColor
                  hasChanged = true

                  if (fastMirrorPixel) {
                    fastMirrorPixel(localX, localY, nextColor)
                  }
                }
              }
            }
            dIdx++
            mIdx++
          }
          dIdx += dStride
          mIdx += mStride
        }
      },
    )

    return hasChanged
  }

  paintBinaryMask(
    tileId: TileId,
    color: Color32,
    brush: PaintBinaryMask,
    x: number,
    y: number,
  ): boolean
  paintBinaryMask(
    tileId: TileId,
    color: Color32,
    brush: PaintBinaryMask,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
  ): boolean
  paintBinaryMask(
    tileId: TileId,
    color: Color32,
    brush: PaintBinaryMask,
    x0: number,
    y0: number,
    x1: number = x0,
    y1: number = y0,
  ): boolean {
    const cA = color >>> 24
    if (cA === 0) return false

    const tile = this.tileSheetPaintBuffer.get(tileId)
    const targetW = tile.w
    const targetH = tile.h

    const maskW = brush.w
    const maskH = brush.h
    const maskData = brush.data
    const centerOffsetX = brush.centerOffsetX
    const centerOffsetY = brush.centerOffsetY

    const dst32 = tile.data
    const fastMirrorPixel = this.createFastMirrorPixel(tileId, targetW)

    let hasChanged = false

    forEachLinePoint(
      x0,
      y0,
      x1,
      y1,
      (px, py) => {
        const topLeftX = Math.floor(px + centerOffsetX)
        const topLeftY = Math.floor(py + centerOffsetY)

        let dstX = topLeftX
        let dstY = topLeftY
        let actualW = maskW
        let actualH = maskH

        if (dstX < 0) {
          actualW += dstX
          dstX = 0
        }

        if (dstY < 0) {
          actualH += dstY
          dstY = 0
        }

        actualW = Math.min(actualW, targetW - dstX)
        actualH = Math.min(actualH, targetH - dstY)

        if (actualW <= 0 || actualH <= 0) return

        const mx = dstX - topLeftX
        const my = dstY - topLeftY

        let dIdx = dstY * targetW + dstX
        let mIdx = my * maskW + mx

        const dStride = targetW - actualW
        const mStride = maskW - actualW

        for (let iy = 0; iy < actualH; iy++) {
          const localY = dstY + iy

          for (let ix = 0; ix < actualW; ix++) {
            const localX = dstX + ix
            const brushA = maskData[mIdx]

            if (brushA === 1) {
              if (dst32[dIdx] !== color) {
                dst32[dIdx] = color
                hasChanged = true

                if (fastMirrorPixel) {
                  fastMirrorPixel(localX, localY, color)
                }
              }
            }
            dIdx++
            mIdx++
          }
          dIdx += dStride
          mIdx += mStride
        }
      },
    )

    return hasChanged
  }

  paintRect(
    tileId: TileId,
    color: Color32,
    brush: PaintRect,
    x: number,
    y: number,
  ): boolean
  paintRect(
    tileId: TileId,
    color: Color32,
    brush: PaintRect,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
  ): boolean
  paintRect(
    tileId: TileId,
    color: Color32,
    brush: PaintRect,
    x0: number,
    y0: number,
    x1: number = x0,
    y1: number = y0,
  ): boolean {
    const cA = color >>> 24
    if (cA === 0) return false

    const tile = this.tileSheetPaintBuffer.get(tileId)
    const targetW = tile.w
    const targetH = tile.h

    const maskW = brush.w
    const maskH = brush.h
    const centerOffsetX = brush.centerOffsetX
    const centerOffsetY = brush.centerOffsetY

    const dst32 = tile.data
    const fastMirrorPixel = this.createFastMirrorPixel(tileId, targetW)

    let hasChanged = false

    forEachLinePoint(
      x0,
      y0,
      x1,
      y1,
      (px, py) => {
        const topLeftX = Math.floor(px + centerOffsetX)
        const topLeftY = Math.floor(py + centerOffsetY)

        let dstX = topLeftX
        let dstY = topLeftY
        let actualW = maskW
        let actualH = maskH

        if (dstX < 0) {
          actualW += dstX
          dstX = 0
        }

        if (dstY < 0) {
          actualH += dstY
          dstY = 0
        }

        actualW = Math.min(actualW, targetW - dstX)
        actualH = Math.min(actualH, targetH - dstY)

        if (actualW <= 0 || actualH <= 0) return

        let dIdx = dstY * targetW + dstX

        const dStride = targetW - actualW

        for (let iy = 0; iy < actualH; iy++) {
          const localY = dstY + iy

          for (let ix = 0; ix < actualW; ix++) {
            const localX = dstX + ix

            if (dst32[dIdx] !== color) {
              dst32[dIdx] = color
              hasChanged = true

              if (fastMirrorPixel) {
                fastMirrorPixel(localX, localY, color)
              }
            }

            dIdx++
          }
          dIdx += dStride
        }
      },
    )

    return hasChanged
  }
}