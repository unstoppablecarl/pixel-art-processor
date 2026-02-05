import { beforeEach, describe, expect, test } from 'vitest'
import { makeTileSheet, type TileSheet } from '../../src/components/CanvasEditor/TileGridEdit/data/TileSheet.ts'
import { makeAxialEdgeWangTileset } from '../../src/lib/wang-tiles/WangTileset.ts'

// A small tileset: 2 vertical × 2 horizontal = 2×2×2×2 = 16 tiles
// Enough to test multi-row, multi-column behavior
const V = 2
const H = 2

describe('TileSheet (with real AxialEdgeWangTileset)', () => {
  const tileSize = 16
  const tileset = makeAxialEdgeWangTileset(V, H)
  let sheet: TileSheet

  beforeEach(() => {
    sheet = makeTileSheet({
      tileSize,
      tileset,
    })
  })

  // -------------------------------------------------------------
  // 1. getTileCoords / getTileRect
  // -------------------------------------------------------------
  test('getTileCoords returns correct sTileX/sTileY', () => {
    const tile = tileset.tiles[5] // index 5
    const coords = sheet.getTileCoords(tile.id)

    expect(coords.sTileX).toBe(5 % sheet.tilesPerRow)
    expect(coords.sTileY).toBe(Math.floor(5 / sheet.tilesPerRow))
  })

  test('getTileRect returns correct sheet rect', () => {
    const tile = tileset.tiles[7]
    const rect = sheet.getTileRect(tile.id)

    expect(rect.x).toBe((tile.index % sheet.tilesPerRow) * tileSize)
    expect(rect.y).toBe(Math.floor(tile.index / sheet.tilesPerRow) * tileSize)
    expect(rect.w).toBe(tileSize)
    expect(rect.h).toBe(tileSize)
  })

  // -------------------------------------------------------------
  // 2. tileLocalToSheet / sheetToTileLocal
  // -------------------------------------------------------------
  test('tileLocalToSheet converts correctly', () => {
    const tile = tileset.tiles[3]
    const { sTileX, sTileY } = sheet.getTileCoords(tile.id)

    const { x, y } = sheet.tileLocalToSheet(tile.id, 4, 9)

    expect(x).toBe(sTileX * tileSize + 4)
    expect(y).toBe(sTileY * tileSize + 9)
  })

  test('sheetToTileLocal converts correctly', () => {
    const tile = tileset.tiles[10]
    const { sTileX, sTileY } = sheet.getTileCoords(tile.id)

    const sheetX = sTileX * tileSize + 7
    const sheetY = sTileY * tileSize + 12

    const { x, y } = sheet.sheetToTileLocal(tile.id, sheetX, sheetY)

    expect(x).toBe(7)
    expect(y).toBe(12)
  })

  // -------------------------------------------------------------
  // 3. tileLocalRectToTileSheetRect
  // -------------------------------------------------------------
  test('tileLocalRectToTileSheetRect produces correct sheet coords', () => {
    const tile = tileset.tiles[6]
    const rect = { x: 3, y: 5, w: 7, h: 8 }

    const { sheetRect, tileAligned } = sheet.tileLocalRectToTileSheetRect(tile.id, rect)
    const { sTileX, sTileY } = sheet.getTileCoords(tile.id)

    expect(sheetRect.x).toBe(sTileX * tileSize + 3)
    expect(sheetRect.y).toBe(sTileY * tileSize + 5)
    expect(sheetRect.w).toBe(7)
    expect(sheetRect.h).toBe(8)

    expect(tileAligned.tileId).toBe(tile.id)
    expect(tileAligned.selectionX).toBe(3)
    expect(tileAligned.selectionY).toBe(5)
    expect(tileAligned.w).toBe(7)
    expect(tileAligned.h).toBe(8)
    expect(tileAligned.bufferX).toBe(0)
    expect(tileAligned.bufferY).toBe(0)
  })

  test('tileLocalRectToTileSheetRect clips to tile bounds', () => {
    const tile = tileset.tiles[0]
    const rect = { x: -10, y: -10, w: 40, h: 40 }

    const { sheetRect, tileAligned } = sheet.tileLocalRectToTileSheetRect(tile.id, rect)

    expect(sheetRect.x).toBe(0)
    expect(sheetRect.y).toBe(0)
    expect(sheetRect.w).toBe(tileSize)
    expect(sheetRect.h).toBe(tileSize)

    expect(tileAligned.selectionX).toBe(0)
    expect(tileAligned.selectionY).toBe(0)
    expect(tileAligned.w).toBe(tileSize)
    expect(tileAligned.h).toBe(tileSize)
  })


  // -------------------------------------------------------------
  // 4. extractTile / writeTile
  // -------------------------------------------------------------
  test('writeTile then extractTile returns identical data', () => {
    const tile = tileset.tiles[4]

    const src = new ImageData(tileSize, tileSize)
    for (let i = 0; i < src.data.length; i += 4) {
      src.data[i] = 255
      src.data[i + 3] = 255
    }

    sheet.writeTile(tile.id, src)
    const out = sheet.extractTile(tile.id)

    expect(out.data).toEqual(src.data)
  })

  // -------------------------------------------------------------
  // 5. resizeTileSize
  // -------------------------------------------------------------
  test('resizeTileSize preserves tile content', () => {
    const tile = tileset.tiles[2]

    const src = new ImageData(tileSize, tileSize)
    src.data.fill(180)
    sheet.writeTile(tile.id, src)

    sheet.resizeTileSize(tileSize * 2)

    const out = sheet.extractTile(tile.id)
    expect(out.width).toBe(tileSize * 2)
    expect(out.height).toBe(tileSize * 2)

    const sum = out.data.reduce((a, v) => a + v, 0)
    expect(sum).toBeGreaterThan(0)
  })

  // -------------------------------------------------------------
  // 7. serialize / deserialize
  // -------------------------------------------------------------
  test('serialize → deserialize preserves tileSize and tileset', () => {
    const serialized = sheet.serialize()
    const restored = makeTileSheet({
      tileSize: serialized.tileSize,
      tilesX: serialized.tilesX,
      tilesY: serialized.tilesY,
      tileset: makeAxialEdgeWangTileset(V, H),
      imageData: new ImageData(serialized.imageData.width, serialized.imageData.height),
    })

    expect(restored.tileSize).toBe(sheet.tileSize)
    expect(restored.tilesPerRow).toBe(sheet.tilesPerRow)
    expect(restored.tilesPerCol).toBe(sheet.tilesPerCol)
  })
})
