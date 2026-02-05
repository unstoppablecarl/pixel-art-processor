// TileGridGeometry.ts
import type { Rect } from '../../../../lib/util/data/Rect.ts'
import type { AxialEdgeWangGrid } from '../../../../lib/wang-tiles/WangGrid.ts'
import type { TileId } from '../../../../lib/wang-tiles/WangTileset.ts'
import type { SelectionRect, TileAlignedRect } from '../lib/ISelection.ts'
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
  ): TileAlignedRect[] {
    const out: TileAlignedRect[] = []

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
          selectionX: gridPixelX - originX,
          selectionY: gridPixelY - originY,

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

  function tileRectsToTileAlignedRects(
    tileId: TileId,
    rects: SelectionRect[],
    originX: number,
    originY: number,
  ): TileAlignedRect[] {
    const { x: tileSheetX, y: tileSheetY } = tileSheet.getTileRect(tileId)

    const out: TileAlignedRect[] = []

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

      const selectionX = x1 - originX
      const selectionY = y1 - originY

      const bufferX = x1 - originX
      const bufferY = y1 - originY

      out.push({
        tileId,

        // sheet space
        sx: sheetX,
        sy: sheetY,

        // selection space
        selectionX,
        selectionY,

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

  function tileAlignedRectToGridRects(rect: TileAlignedRect): SelectionRect[] {
    const { tileId, selectionX, selectionY, w, h, mask } = rect
    const results: SelectionRect[] = []

    tileGrid.mapWithTileId(tileId, (gTileX, gTileY) => {
      const x = gTileX * tileSize + selectionX
      const y = gTileY * tileSize + selectionY

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

  function selectionRectToTileAlignedRect(
    rect: SelectionRect,
    tileId: TileId,
  ): TileAlignedRect {
    // rect.x/y are selection‑space inside the tile
    // rect.w/h are the clipped selection region inside the tile
    // rect.mask is the selection mask for this clipped region

    const { x: tileSheetX, y: tileSheetY } = tileSheet.getTileRect(tileId)

    return {
      tileId,

      // sheet space
      sx: tileSheetX + rect.x,
      sy: tileSheetY + rect.y,

      // selection space
      selectionX: rect.x,
      selectionY: rect.y,

      // all spaces
      w: rect.w,
      h: rect.h,

      // pixel buffer space
      bufferX: rect.x,
      bufferY: rect.y,
      mask: rect.mask,
    }
  }

  function getOverlappingTilesOnGrid(rect: Rect) {
    return tileGrid.getOverlappingTiles(rect, tileSize)
  }

  return {
    tileSize,
    tileSheet,
    tileGrid,
    tileAlignedRectToGridRects,
    gridRectsToTileAlignedRects,
    tileRectsToTileAlignedRects,
    selectionRectToTileAlignedRect,
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

  for (let row = 0; row < h; row++) {
    const srcRow = (srcY + row) * stride + srcX
    const dstRow = row * w
    out.set(mask.subarray(srcRow, srcRow + w), dstRow)
  }

  return out
}
