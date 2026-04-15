import { extractMaskBuffer, type NullableMaskRect } from 'pixel-data-js'
import { type Rect } from '../../../lib/util/data/Rect.ts'
import type { TileId, WangTile } from '../../../lib/wang-tiles/WangTileset.ts'
import type { DrawRect, GridOriginTileAlignedRect, TileOriginTileAlignedRect } from '../lib/ISelection.ts'
import type { TileGridManager } from './TileGridManager.ts'

export type TileGridGeometry = ReturnType<typeof makeTileGridGeometry>

export function makeTileGridGeometry(
  tileGridManager: TileGridManager,
) {
  const SCRATCH_gridPixelToGridTile = {
    gTileX: -1,
    gTileY: -1,
    tile: null as unknown as WangTile<number>,
  }

  function gridPixelToGridTile(gx: number, gy: number) {
    const tileSize = tileGridManager.tileSize.value
    const gTileX = Math.floor(gx / tileSize)
    const gTileY = Math.floor(gy / tileSize)
    const tile = tileGridManager.tileGrid.value.get(gTileX, gTileY)
    if (!tile) return null
    SCRATCH_gridPixelToGridTile.gTileX = gTileX
    SCRATCH_gridPixelToGridTile.gTileY = gTileY
    SCRATCH_gridPixelToGridTile.tile = tile
    return SCRATCH_gridPixelToGridTile
  }

  const SCRATCH_gridPixelToTilePixel = {
    tileId: -1 as TileId,
    tx: -1,
    ty: -1,
  }

  function gridPixelToTilePixel(gx: number, gy: number) {
    const hit = gridPixelToGridTile(gx, gy)
    if (!hit) return null
    const { gTileX, gTileY, tile } = hit
    const tx = gx - gTileX * tileGridManager.tileSize.value
    const ty = gy - gTileY * tileGridManager.tileSize.value

    SCRATCH_gridPixelToTilePixel.tileId = tile.id
    SCRATCH_gridPixelToTilePixel.tx = tx
    SCRATCH_gridPixelToTilePixel.ty = ty

    return SCRATCH_gridPixelToTilePixel
  }

  function gridPixelToSheetPixel(gx: number, gy: number) {
    const hit = gridPixelToTilePixel(gx, gy)
    if (!hit) return null
    const { tileId, tx, ty } = hit
    const { x, y } = tileGridManager.tileSheet.value.tileLocalToSheet(tileId, tx, ty)
    return { tileId, tx, ty, x, y }
  }

  function gridTileToGridPixel(gTileX: number, gTileY: number, tx = 0, ty = 0) {
    return {
      gx: gTileX * tileGridManager.tileSize.value + tx,
      gy: gTileY * tileGridManager.tileSize.value + ty,
    }
  }

  function gridRectsToTileAlignedRects(
    rects: NullableMaskRect[],
    originX: number,
    originY: number,
  ): GridOriginTileAlignedRect[] {
    const out: GridOriginTileAlignedRect[] = []
    const tileGrid = tileGridManager.tileGrid.value
    const tileSize = tileGridManager.tileSize.value

    for (const r of rects) {
      const overlaps = tileGrid.getOverlappingTiles(
        { x: r.x, y: r.y, w: r.w, h: r.h },
        tileSize,
      )

      for (const o of overlaps) {
        const { tile, tileOverlap } = o
        const { x: tx, y: ty, w, h } = tileOverlap
        if (w <= 0 || h <= 0) continue

        let maskData: Uint8Array | null = null
        if (r.data) {
          maskData = extractMaskBuffer(r.data, r.w, o.sourceX, o.sourceY, w, h)
        }

        const { x: tsx, y: tsy } = tileGridManager.tileSheet.value.getTileRect(tile.id)

        const gridPixelX = r.x + o.sourceX
        const gridPixelY = r.y + o.sourceY

        const base = {
          tileId: tile.id,

          // sheet space
          sx: tsx + tx,
          sy: tsy + ty,

          // selection space (relative to selection origin)
          gridSelectionX: gridPixelX - originX,
          gridSelectionY: gridPixelY - originY,

          // shared
          w,
          h,

          // pixel buffer space
          bufferX: o.sourceX,
          bufferY: o.sourceY,
        }

        if (maskData) {
          out.push({
            ...base,
            data: maskData,
            type: r.type,
          } as GridOriginTileAlignedRect)
        } else {
          out.push(base)
        }
      }
    }

    return out
  }

  function tileRectsToDuplicatedGridRects(
    tileId: TileId,
    rects: NullableMaskRect[],
    originX: number,
    originY: number,
  ) {
    const alignedRects = tileRectsToTileAlignedRects(tileId, rects, originX, originY)
    return alignedRects.flatMap(r => tileOriginTileAlignedRectToGridRects(r))
  }

  function gridRectsToDuplicatedGridRects(
    rects: NullableMaskRect[],
    originX: number,
    originY: number,
  ) {
    const alignedRects = gridRectsToTileAlignedRects(rects, originX, originY)
    return alignedRects.flatMap(r => gridOriginTileAlignedRectToGridRects(r, originX, originY))
  }

  function gridRectsToDuplicatedGridDrawRects(
    rects: NullableMaskRect[],
    originX: number,
    originY: number,
  ): DrawRect[] {
    const aligned = gridRectsToTileAlignedRects(rects, originX, originY)
    const tileGrid = tileGridManager.tileGrid.value

    const out: DrawRect[] = []
    for (const r of aligned) {
      const localX = originX + r.gridSelectionX
      const localY = originY + r.gridSelectionY
      tileGrid.mapWithTileId(r.tileId, (gx, gy) => {
        const tileOriginX = gx * tileGridManager.tileSize.value
        const tileOriginY = gy * tileGridManager.tileSize.value
        out.push({
          dx: tileOriginX + (localX % tileGridManager.tileSize.value),
          dy: tileOriginY + (localY % tileGridManager.tileSize.value),
          sx: r.bufferX,
          sy: r.bufferY,
          w: r.w,
          h: r.h,
          data: r.data,
          type: r.type,
          tileId: r.tileId,
        } as DrawRect)
      })
    }
    return out
  }

  function tileRectsToTileAlignedRects(
    tileId: TileId,
    rects: NullableMaskRect[],
    originX: number,
    originY: number,
  ): TileOriginTileAlignedRect[] {
    const { x: tileSheetX, y: tileSheetY } = tileGridManager.tileSheet.value.getTileRect(tileId)
    const tileSize = tileGridManager.tileSize.value

    const out: TileOriginTileAlignedRect[] = []

    for (const r of rects) {
      const x1 = Math.max(0, r.x)
      const y1 = Math.max(0, r.y)
      const x2 = Math.min(tileSize, r.x + r.w)
      const y2 = Math.min(tileSize, r.y + r.h)

      const w = x2 - x1
      const h = y2 - y1
      if (w <= 0 || h <= 0) continue

      const clippedMask = r.data
        ? extractMaskBuffer(r.data, r.w, x1 - r.x, y1 - r.y, w, h)
        : null

      const sheetX = tileSheetX + x1
      const sheetY = tileSheetY + y1

      const tileSelectionX = x1 - originX
      const tileSelectionY = y1 - originY

      const bufferX = x1 - originX
      const bufferY = y1 - originY

      const base = {
        tileId,

        // sheet space
        sx: sheetX,
        sy: sheetY,

        // selection space
        tileSelectionX,
        tileSelectionY,

        // all spaces
        w,
        h,

        // pixel buffer space
        bufferX,
        bufferY,
      }

      if (clippedMask) {
        out.push({
          ...base,
          data: clippedMask,
          type: r.type,
        } as TileOriginTileAlignedRect)
      } else {
        out.push(base)
      }
    }

    return out
  }

  function tileOriginTileAlignedRectToGridRects(rect: TileOriginTileAlignedRect): NullableMaskRect[] {
    const { tileId, tileSelectionX, tileSelectionY, w, h, data, type } = rect
    const results: NullableMaskRect[] = []
    const tileSize = tileGridManager.tileSize.value

    tileGridManager.tileGrid.value.mapWithTileId(tileId, (gTileX, gTileY) => {
      const x = gTileX * tileSize + tileSelectionX
      const y = gTileY * tileSize + tileSelectionY
      const rect = { x, y, w, h }
      if (data) {
        results.push({
          ...rect,
          data,
          type,
        })
      } else {
        results.push({
          ...rect,
          data: null,
          type: null,
        })
      }
    })

    return results
  }

  function gridOriginTileAlignedRectToGridRects(
    rect: GridOriginTileAlignedRect,
    originX: number,
    originY: number,
  ): NullableMaskRect[] {
    const { tileId, gridSelectionX, gridSelectionY, w, h, data, type } = rect
    const results: NullableMaskRect[] = []
    const t = gridPixelToTilePixel(gridSelectionX, gridSelectionY)
    if (!t) throw new Error('invalid rect')
    const tileSize = tileGridManager.tileSize.value

    tileGridManager.tileGrid.value.mapWithTileId(tileId, (gTileX, gTileY) => {
      const x = gTileX * tileSize + t.tx + originX
      const y = gTileY * tileSize + t.ty + originY

      const rect = { x, y, w, h }
      if (data) {
        results.push({
          ...rect,
          data,
          type,
        })
      } else {
        results.push({
          ...rect,
          data: null,
          type: null,
        })
      }
    })

    return results
  }

  function getOverlappingTilesOnGrid(rect: Rect) {
    return tileGridManager.tileGrid.value.getOverlappingTiles(rect, tileGridManager.tileSize.value)
  }

  return {
    get tileSize() {
      return tileGridManager.tileSize.value
    },
    get tileSheet() {
      return tileGridManager.tileSheet.value
    },
    get tileGrid() {
      return tileGridManager.tileGrid.value
    },
    // tileAlignedRectToGridRects,
    gridRectsToTileAlignedRects,
    tileRectsToTileAlignedRects,
    gridOriginTileAlignedRectToGridRects,
    tileOriginTileAlignedRectToGridRects,
    gridRectsToDuplicatedGridDrawRects,
    tileRectsToDuplicatedGridRects,
    gridRectsToDuplicatedGridRects,
    gridPixelToGridTile,
    gridPixelToTilePixel,
    gridPixelToSheetPixel,
    gridTileToGridPixel,
    getOverlappingTilesOnGrid,
    // sheetPixelToTileId: tileSheet.sheetPixelToTileId,
    // tileLocalToSheet: tileSheet.tileLocalToSheet,
  }
}