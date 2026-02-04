import type { Rect } from '../../../../lib/util/data/Rect.ts'
import type { AxialEdgeWangGrid } from '../../../../lib/wang-tiles/WangGrid.ts'
import type { TileId } from '../../../../lib/wang-tiles/WangTileset.ts'
import type { SelectionTileSheetRect } from '../lib/TileSheetSelection.ts'
import type { TileSheet } from './TileSheet.ts'

/*
  coord system naming
  tile pixel: tx, ty
  grid tile position: gTileX, gTileY
  grid pixel: gx, gy
  sheet pixel: sx, sy
  sheet tile position: sTileX, sTileY
 */

export type ProjectedGridRect = {
  tileId: TileId
  gx: number
  gy: number
  w: number
  h: number
  bufferX: number
  bufferY: number
  mask: Uint8Array | null
}

export type TileGridGeometry = ReturnType<typeof makeTileGridGeometry>

export function makeTileGridGeometry(
  tileGrid: AxialEdgeWangGrid<number>,
  tileSheet: TileSheet,
  tileSize: number,
) {
  // -------------------------------------------------------------
  // GRID PIXEL → GRID TILE
  // -------------------------------------------------------------
  function gridPixelToGridTile(gx: number, gy: number) {
    const gTileX = Math.floor(gx / tileSize)
    const gTileY = Math.floor(gy / tileSize)
    const tile = tileGrid.get(gTileX, gTileY)
    if (!tile) return null
    return { gTileX, gTileY, tile }
  }

  // -------------------------------------------------------------
  // GRID PIXEL → TILE PIXEL
  // -------------------------------------------------------------
  function gridPixelToTilePixel(gx: number, gy: number) {
    const hit = gridPixelToGridTile(gx, gy)
    if (!hit) return null
    const { gTileX, gTileY, tile } = hit
    const tx = gx - gTileX * tileSize
    const ty = gy - gTileY * tileSize
    return { tileId: tile.id, tx, ty }
  }

  // -------------------------------------------------------------
  // GRID PIXEL → SHEET PIXEL
  // -------------------------------------------------------------
  function gridPixelToSheetPixel(gx: number, gy: number) {
    const hit = gridPixelToTilePixel(gx, gy)
    if (!hit) return null
    const { tileId, tx, ty } = hit
    const { x, y } = tileSheet.tileLocalToSheet(tileId, tx, ty)
    return { tileId, tx, ty, x, y }
  }

  // -------------------------------------------------------------
  // GRID TILE → GRID PIXEL
  // -------------------------------------------------------------
  function gridTileToGridPixel(gTileX: number, gTileY: number, tx = 0, ty = 0) {
    return {
      gx: gTileX * tileSize + tx,
      gy: gTileY * tileSize + ty,
    }
  }

  // -------------------------------------------------------------
  // GRID RECT → SHEET RECTS
  // -------------------------------------------------------------
  function gridRectToSheetRects(rect: Rect): SelectionTileSheetRect[] {
    const overlaps = tileGrid.getOverlappingTiles(rect, tileSize)
    const out: SelectionTileSheetRect[] = []

    for (const o of overlaps) {
      const { tile, tileOverlap } = o
      const { x: tx, y: ty, w, h } = tileOverlap
      if (w <= 0 || h <= 0) continue

      const tileRect = tileSheet.getTileRect(tile.id)
      const sx = tileRect.x + tx
      const sy = tileRect.y + ty

      out.push({
        tileId: tile.id,
        x: sx,
        y: sy,
        w,
        h,
        bufferX: o.sourceX,
        bufferY: o.sourceY,
        mask: null,
      })
    }

    return out
  }

  // -------------------------------------------------------------
  // SHEET RECT → GRID RECTS
  // -------------------------------------------------------------
  function sheetRectToGridRects(rect: SelectionTileSheetRect): ProjectedGridRect[] {
    const { tileId, x, y, w, h, bufferX, bufferY, mask } = rect

    const { x: tx, y: ty } = tileSheet.sheetToTileLocal(tileId, x, y)

    const results: ProjectedGridRect[] = []

    tileGrid.mapWithTileId(tileId, (gTileX, gTileY) => {
      const gx = gTileX * tileSize + tx
      const gy = gTileY * tileSize + ty

      results.push({
        tileId,
        gx,
        gy,
        w,
        h,
        bufferX,
        bufferY,
        mask,
      })
    })

    return results
  }

  return {
    gridPixelToGridTile,
    gridPixelToTilePixel,
    gridPixelToSheetPixel,
    gridTileToGridPixel,
    gridRectToSheetRects,
    sheetRectToGridRects,
  }
}

