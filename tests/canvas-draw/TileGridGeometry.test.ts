import { describe, expect, it } from 'vitest'
import { makeTileGridGeometry } from '../../src/components/CanvasEditor/TileGridEdit/data/TileGridGeometry.ts'
import type { TileSheet } from '../../src/components/CanvasEditor/TileGridEdit/data/TileSheet.ts'
import type {
  GridSelectionRect,
  TileAlignedRect,
} from '../../src/components/CanvasEditor/TileGridEdit/lib/ISelection.ts'
import type { AxialEdgeWangGrid } from '../../src/lib/wang-tiles/WangGrid.ts'
import type { TileId, WangTile } from '../../src/lib/wang-tiles/WangTileset.ts'

function tid(id: string): TileId {
  return id as TileId
}

function makeMockGrid(tileSize: number) {
  return {
    get(x, y) {
      if (x === 0 && y === 0) return { id: tid('tile-1') }
      if (x === 1 && y === 0) return { id: tid('tile-2') }
      return null
    },
    getOverlappingTiles(rect, size) {
      const tiles = []
      const minX = Math.floor(rect.x / size)
      const minY = Math.floor(rect.y / size)
      const maxX = Math.floor((rect.x + rect.w - 1) / size)
      const maxY = Math.floor((rect.y + rect.h - 1) / size)

      for (let gx = minX; gx <= maxX; gx++) {
        for (let gy = minY; gy <= maxY; gy++) {
          const tile = this.get(gx, gy)
          if (!tile) continue

          const tileX = gx * size
          const tileY = gy * size

          const left = Math.max(rect.x, tileX)
          const top = Math.max(rect.y, tileY)
          const right = Math.min(rect.x + rect.w, tileX + size)
          const bottom = Math.min(rect.y + rect.h, tileY + size)

          const ow = Math.max(0, right - left)
          const oh = Math.max(0, bottom - top)
          if (ow === 0 || oh === 0) continue

          const ox = left - tileX
          const oy = top - tileY

          tiles.push({
            tile,
            tileOverlap: { x: ox, y: oy, w: ow, h: oh },
            sourceX: ox,
            sourceY: oy,
          })
        }
      }

      return tiles
    },
    mapWithTileId(tileId, fn) {
      if (tileId === tid('tile-1')) fn(0, 0, {} as WangTile<number>)
      if (tileId === tid('tile-2')) fn(1, 0, {} as WangTile<number>)
    },
  } as AxialEdgeWangGrid<number>
}

function makeMockSheet(tileSize: number) {
  return {
    getTileRect(tileId) {
      if (tileId === tid('tile-1')) return { x: 0, y: 0, w: tileSize, h: tileSize }
      if (tileId === tid('tile-2')) return { x: tileSize, y: 0, w: tileSize, h: tileSize }
      throw new Error('bad tileId')
    },
    tileLocalToSheet(tileId, tx, ty) {
      const base = this.getTileRect(tileId)
      return { x: base.x + tx, y: base.y + ty }
    },
    sheetPixelToTileId(x, y) {
      if (x < tileSize) return tid('tile-1')
      return tid('tile-2')
    },
  } as TileSheet
}

describe('TileGridGeometry', () => {
  const tileSize = 16
  const grid = makeMockGrid(tileSize)
  const sheet = makeMockSheet(tileSize)
  const geom = makeTileGridGeometry(grid, sheet, tileSize)

  it('converts grid pixels to grid tiles', () => {
    const hit = geom.gridPixelToGridTile(5, 5)
    expect(hit?.tile.id).toBe(tid('tile-1'))

    const hit2 = geom.gridPixelToGridTile(20, 5)
    expect(hit2?.tile.id).toBe(tid('tile-2'))

    const miss = geom.gridPixelToGridTile(100, 100)
    expect(miss).toBeNull()
  })

  it('converts grid pixels to tile pixels', () => {
    const hit = geom.gridPixelToTilePixel(5, 5)
    expect(hit).toEqual({ tileId: tid('tile-1'), tx: 5, ty: 5 })
  })

  it('converts grid pixels to sheet pixels', () => {
    const hit = geom.gridPixelToSheetPixel(5, 5)
    expect(hit?.x).toBe(5)
    expect(hit?.y).toBe(5)

    const hit2 = geom.gridPixelToSheetPixel(20, 5)
    expect(hit2?.x).toBe(16 + 4)
  })

  it('projects grid rects to tile-aligned rects', () => {
    const rect: GridSelectionRect = {
      x: 4,
      y: 4,
      w: 8,
      h: 8,
      mask: null,
    }

    const out = geom.gridRectsToTileAlignedRects([rect])
    expect(out.length).toBe(1)
    expect(out[0].tileId).toBe(tid('tile-1'))
    expect(out[0].selectionX).toBe(4)
    expect(out[0].selectionY).toBe(4)
    expect(out[0].w).toBe(8)
    expect(out[0].h).toBe(8)
  })

  it('projects tile-aligned rects to sheet rects', () => {
    const r: TileAlignedRect = {
      tileId: tid('tile-2'),
      selectionX: 3,
      selectionY: 4,
      w: 5,
      h: 6,
      bufferX: 3,
      bufferY: 4,
      mask: null,
    }

    const out = geom.tileAlignedRectToSheetRect(r)
    expect(out.x).toBe(16 + 3)
    expect(out.y).toBe(4)
    expect(out.w).toBe(5)
    expect(out.h).toBe(6)
  })

  it('fans out tile-aligned rects to all grid instances', () => {
    const r: TileAlignedRect = {
      tileId: tid('tile-1'),
      selectionX: 2,
      selectionY: 3,
      w: 4,
      h: 5,
      bufferX: 2,
      bufferY: 3,
      mask: null,
    }

    const out = geom.tileAlignedRectToGridRects(r)
    expect(out.length).toBe(1)
    expect(out[0].x).toBe(2)
    expect(out[0].y).toBe(3)
  })

  it('slices masks correctly', () => {
    const mask = new Uint8Array([
      1, 2, 3, 4,
      5, 6, 7, 8,
      9, 10, 11, 12,
      13, 14, 15, 16,
    ])

    const rect: GridSelectionRect = {
      x: 0,
      y: 0,
      w: 4,
      h: 4,
      mask,
    }

    const tiles = geom.gridRectsToTileAlignedRects([rect])
    expect(tiles.length).toBe(1)
    expect(tiles[0].mask?.length).toBe(16)
    expect(tiles[0].mask?.[0]).toBe(1)
    expect(tiles[0].mask?.[15]).toBe(16)
  })

  it('validates tile-aligned rects', () => {
    const good: TileAlignedRect = {
      tileId: tid('tile-1'),
      selectionX: 0,
      selectionY: 0,
      w: 8,
      h: 8,
      bufferX: 0,
      bufferY: 0,
      mask: new Uint8Array(64),
    }

    expect(() => geom.validateTileAlignedRect(good, 64, 64)).not.toThrow()

    const bad: TileAlignedRect = {
      tileId: tid('tile-1'),
      selectionX: -1,
      selectionY: 0,
      w: 8,
      h: 8,
      bufferX: 0,
      bufferY: 0,
      mask: new Uint8Array(64),
    }

    expect(() => geom.validateTileAlignedRect(bad, 64, 64)).toThrow()
  })
})
