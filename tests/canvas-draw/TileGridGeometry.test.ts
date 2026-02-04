import { describe, expect, test } from 'vitest'
import { makeTileGridGeometry } from '../../src/components/CanvasEditor/TileGridEdit/data/TileGridGeometry.ts'
import { makeTileSheet } from '../../src/components/CanvasEditor/TileGridEdit/data/TileSheet.ts'
import { makeAxialEdgeWangGrid } from '../../src/lib/wang-tiles/WangGrid.ts'
import { makeAxialEdgeWangTileset } from '../../src/lib/wang-tiles/WangTileset.ts'

describe('TileGridGeometry', () => {
  const tileSize = 16
  const tileset = makeAxialEdgeWangTileset(2, 2)
  const tileGrid = makeAxialEdgeWangGrid(tileset)
  const tileSheet = makeTileSheet({ tileset, tileSize })

  const geom = makeTileGridGeometry(tileGrid, tileSheet, tileSize)

  test('gridPixelToGridTile', () => {
    const r = geom.gridPixelToGridTile(20, 10)
    expect(r?.gTileX).toBe(1)
    expect(r?.gTileY).toBe(0)
  })

  test('gridPixelToTilePixel', () => {
    const r = geom.gridPixelToTilePixel(20, 10)
    expect(r?.tx).toBe(20 - 1 * tileSize)
    expect(r?.ty).toBe(10 - 0 * tileSize)
  })

  test('gridPixelToSheetPixel', () => {
    const r = geom.gridPixelToSheetPixel(20, 10)
    const tile = tileGrid.get(1, 0)!
    const tileRect = tileSheet.getTileRect(tile.id)
    expect(r?.x).toBe(tileRect.x + r!.tx)
    expect(r?.y).toBe(tileRect.y + r!.ty)
  })

  test('gridTileToGridPixel', () => {
    const { gx, gy } = geom.gridTileToGridPixel(2, 3)
    expect(gx).toBe(2 * tileSize)
    expect(gy).toBe(3 * tileSize)
  })

  test('gridRectToSheetRects produces valid sheet rects', () => {
    const rect = { x: 10, y: 10, w: 20, h: 20 }
    const sheetRects = geom.gridRectToSheetRects(rect)
    for (const r of sheetRects) {
      const tileRect = tileSheet.getTileRect(r.tileId)
      expect(r.x).toBeGreaterThanOrEqual(tileRect.x)
      expect(r.y).toBeGreaterThanOrEqual(tileRect.y)
    }
  })

  test('sheetRectToGridRects produces correct gx/gy', () => {
    const tile = tileset.tiles[7]
    const tileRect = tileSheet.getTileRect(tile.id)

    const rect = {
      tileId: tile.id,
      x: tileRect.x + 3,
      y: tileRect.y + 5,
      w: 4,
      h: 4,
      bufferX: 0,
      bufferY: 0,
      mask: null,
    }

    const projected = geom.sheetRectToGridRects(rect)

    const { x: tx, y: ty } = tileSheet.sheetToTileLocal(tile.id, rect.x, rect.y)
    const { gTileX, gTileY } = tileGrid.mapWithTileId(tile.id, (gx, gy) => ({ gTileX: gx, gTileY: gy }))[0]

    console.log({
      tileId: tile.id,
      tileRect,
      rectX: rect.x,
      txComputed: tileSheet.sheetToTileLocal(tile.id, rect.x, rect.y).x,
    })

    for (const g of projected) {
      expect(g.gx).toBe(gTileX * tileSize + tx)
      expect(g.gy).toBe(gTileY * tileSize + ty)
    }
  })
})
