// TileGridGeometry.ts
import type { Rect } from '../../../../lib/util/data/Rect.ts'
import type { AxialEdgeWangGrid } from '../../../../lib/wang-tiles/WangGrid.ts'
import type { TileId } from '../../../../lib/wang-tiles/WangTileset.ts'
import type {
  DrawRect,
  GridOriginTileAlignedRect,
  SelectionRect,
  TileOriginTileAlignedRect,
} from '../lib/ISelection.ts'
import type { TileSheet } from './TileSheet.ts'

export type TileGridGeometry = ReturnType<typeof makeTileGridGeometry>

export function makeTileGridGeometry(
  tileGrid: AxialEdgeWangGrid<number>,
  tileSheet: TileSheet,
  tileSize: number,
) {
  function gridPixelToGridTile(gx: number, gy: number) {
    const gTileX = Math.floor(gx / tileSize)
    const gTileY = Math.floor(gy / tileSize)
    const tile = tileGrid.get(gTileX, gTileY)
    if (!tile) return null
    return { gTileX, gTileY, tile }
  }

  function gridPixelToTilePixel(gx: number, gy: number) {
    const hit = gridPixelToGridTile(gx, gy)
    if (!hit) return null
    const { gTileX, gTileY, tile } = hit
    const tx = gx - gTileX * tileSize
    const ty = gy - gTileY * tileSize
    return { tileId: tile.id, tx, ty }
  }

  function gridPixelToSheetPixel(gx: number, gy: number) {
    const hit = gridPixelToTilePixel(gx, gy)
    if (!hit) return null
    const { tileId, tx, ty } = hit
    const { x, y } = tileSheet.tileLocalToSheet(tileId, tx, ty)
    return { tileId, tx, ty, x, y }
  }

  function gridTileToGridPixel(gTileX: number, gTileY: number, tx = 0, ty = 0) {
    return {
      gx: gTileX * tileSize + tx,
      gy: gTileY * tileSize + ty,
    }
  }

  function gridRectsToTileAlignedRects(
    rects: SelectionRect[],
    originX: number,
    originY: number,
  ): GridOriginTileAlignedRect[] {
    const out: GridOriginTileAlignedRect[] = []

    for (const r of rects) {
      const overlaps = tileGrid.getOverlappingTiles(
        { x: r.x, y: r.y, w: r.w, h: r.h },
        tileSize,
      )

      for (const o of overlaps) {
        const { tile, tileOverlap } = o
        const { x: tx, y: ty, w, h } = tileOverlap
        if (w <= 0 || h <= 0) continue

        const mask = sliceMask(r.mask, o.sourceX, o.sourceY, w, h, r.w)

        const { x: tsx, y: tsy } = tileSheet.getTileRect(tile.id)

        const gridPixelX = r.x + o.sourceX
        const gridPixelY = r.y + o.sourceY

        out.push({
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
          mask,
        })
      }
    }

    return out
  }

  function tileRectsToDuplicatedGridRects(
    tileId: TileId,
    rects: SelectionRect[],
    originX: number,
    originY: number,
  ) {
    const alignedRects = tileRectsToTileAlignedRects(tileId, rects, originX, originY)
    return alignedRects.flatMap(r => tileOriginTileAlignedRectToGridRects(r))
  }

  function gridRectsToDuplicatedGridRects(
    rects: SelectionRect[],
    originX: number,
    originY: number,
  ) {
    const alignedRects = gridRectsToTileAlignedRects(rects, originX, originY)
    return alignedRects.flatMap(r => gridOriginTileAlignedRectToGridRects(r, originX, originY))
  }

  function gridRectsToDuplicatedGridDrawRects(
    rects: SelectionRect[],
    originX: number,
    originY: number,
  ): DrawRect[] {
    const aligned = gridRectsToTileAlignedRects(rects, originX, originY)

    const out: DrawRect[] = []
    for (const r of aligned) {
      const localX = originX + r.gridSelectionX
      const localY = originY + r.gridSelectionY
      tileGrid.mapWithTileId(r.tileId, (gx, gy) => {
        const tileOriginX = gx * tileSize
        const tileOriginY = gy * tileSize
        out.push({
          dx: tileOriginX + (localX % tileSize),
          dy: tileOriginY + (localY % tileSize),
          sx: r.bufferX,
          sy: r.bufferY,
          w: r.w,
          h: r.h,
          mask: r.mask ?? undefined,
          tileId: r.tileId,
        })
      })
    }
    return out
  }

  function tileRectsToTileAlignedRects(
    tileId: TileId,
    rects: SelectionRect[],
    originX: number,
    originY: number,
  ): TileOriginTileAlignedRect[] {
    const { x: tileSheetX, y: tileSheetY } = tileSheet.getTileRect(tileId)

    const out: TileOriginTileAlignedRect[] = []

    for (const r of rects) {
      const x1 = Math.max(0, r.x)
      const y1 = Math.max(0, r.y)
      const x2 = Math.min(tileSize, r.x + r.w)
      const y2 = Math.min(tileSize, r.y + r.h)

      const w = x2 - x1
      const h = y2 - y1
      if (w <= 0 || h <= 0) continue

      const clippedMask = r.mask
        ? sliceMask(r.mask, x1 - r.x, y1 - r.y, w, h, r.w)
        : null

      const sheetX = tileSheetX + x1
      const sheetY = tileSheetY + y1

      const tileSelectionX = x1 - originX
      const tileSelectionY = y1 - originY

      const bufferX = x1 - originX
      const bufferY = y1 - originY

      out.push({
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
        mask: clippedMask,
      })
    }

    return out
  }

  function tileOriginTileAlignedRectToGridRects(rect: TileOriginTileAlignedRect): SelectionRect[] {
    const { tileId, tileSelectionX, tileSelectionY, w, h, mask } = rect
    const results: SelectionRect[] = []

    tileGrid.mapWithTileId(tileId, (gTileX, gTileY) => {
      const x = gTileX * tileSize + tileSelectionX
      const y = gTileY * tileSize + tileSelectionY

      results.push({
        x,
        y,
        w,
        h,
        mask,
      })
    })

    return results
  }

  function gridOriginTileAlignedRectToGridRects(
    rect: GridOriginTileAlignedRect,
    originX: number,
    originY: number,
  ): SelectionRect[] {
    const { tileId, gridSelectionX, gridSelectionY, w, h, mask } = rect
    const results: SelectionRect[] = []
    const t = gridPixelToTilePixel(gridSelectionX, gridSelectionY)
    if (!t) throw new Error('invalid rect')

    tileGrid.mapWithTileId(tileId, (gTileX, gTileY) => {
      const x = gTileX * tileSize + t.tx + originX
      const y = gTileY * tileSize + t.ty + originY

      results.push({
        x,
        y,
        w,
        h,
        mask,
      })
    })

    return results
  }

  function getOverlappingTilesOnGrid(rect: Rect) {
    return tileGrid.getOverlappingTiles(rect, tileSize)
  }

  return {
    tileSize,
    tileSheet,
    tileGrid,
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
    sheetPixelToTileId: tileSheet.sheetPixelToTileId,
    tileLocalToSheet: tileSheet.tileLocalToSheet,
  }
}

export function sliceMask(
  mask: Uint8Array | null,
  srcX: number,
  srcY: number,
  w: number,
  h: number,
  stride: number,
): Uint8Array | null {
  if (!mask) return null
  const out = new Uint8Array(w * h)

  // Calculate the total height of the source mask based on the buffer size
  const srcH = mask.length / stride

  for (let row = 0; row < h; row++) {
    const currentSrcY = srcY + row

    // Safety Check: If the requested row is outside the source mask, skip it (leave as 0)
    if (currentSrcY < 0 || currentSrcY >= srcH) continue

    // Calculate valid horizontal range within the source stride
    // We only copy if srcX is within the actual bounds of the source width
    const start = Math.max(0, srcX)
    const end = Math.min(stride, srcX + w)

    if (start < end) {
      const srcOffset = currentSrcY * stride + start
      const dstOffset = row * w + (start - srcX)
      const count = end - start

      out.set(mask.subarray(srcOffset, srcOffset + count), dstOffset)
    }
  }

  return out
}