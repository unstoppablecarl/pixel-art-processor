import { type TileId } from '../../../../lib/wang-tiles/WangTileset.ts'
import type { TileSheet } from './TileSheet.ts'
import type { TileSheetPixelAccumulator } from './TileSheetPixelAccumulator.ts'

// written for perf over readability
export function duplicateEdgePixels(
  {
    tileId,
    borderThickness,
    tileSheet,
    accumulator,
  }: {
    tileId: TileId
    borderThickness: number
    tileSheet: TileSheet
    accumulator: TileSheetPixelAccumulator
  }) {
  const entry = accumulator.getRawBufferForTile(tileId)
  if (!entry || entry.count === 0) return

  const { data, count } = entry
  const { tileSize, tileset } = tileSheet
  const tile = tileset.byId.get(tileId)!
  const max = tileSize - 1

  const nEdge = tileset.getTilesWithSameEdge(tile, 'N')
  const sEdge = tileset.getTilesWithSameEdge(tile, 'S')
  const wEdge = tileset.getTilesWithSameEdge(tile, 'W')
  const eEdge = tileset.getTilesWithSameEdge(tile, 'E')

  for (let i = 0; i < count; i++) {
    const p = i * 4
    if (data[p + 3] === 1) continue

    const coords = data[p]
    const x = coords >> 16
    const y = coords & 0xFFFF
    const rgba = data[p + 1]
    const blend = accumulator.getBlendAtIdx(data[p + 2])
    const color = { r: (rgba >> 24) & 0xFF, g: (rgba >> 16) & 0xFF, b: (rgba >> 8) & 0xFF, a: rgba & 0xFF }

    // --- NORTH (Top) ---
    if (y < borderThickness) {
      for (const n of nEdge.sameEdge) accumulator.addTile(n.id, x, y, color, blend, true)
      for (const n of nEdge.mirroredEdge) accumulator.addTile(n.id, x, max - y, color, blend, true)
    }

    // --- SOUTH (Bottom) ---
    if (y > max - borderThickness) {
      for (const n of sEdge.sameEdge) accumulator.addTile(n.id, x, y, color, blend, true)
      for (const n of sEdge.mirroredEdge) accumulator.addTile(n.id, x, max - y, color, blend, true)
    }

    // --- WEST (Left) ---
    if (x < borderThickness) {
      for (const n of wEdge.sameEdge) accumulator.addTile(n.id, x, y, color, blend, true)
      for (const n of wEdge.mirroredEdge) accumulator.addTile(n.id, max - x, y, color, blend, true)
    }

    // --- EAST (Right) ---
    if (x > max - borderThickness) {
      for (const n of eEdge.sameEdge) accumulator.addTile(n.id, x, y, color, blend, true)
      for (const n of eEdge.mirroredEdge) accumulator.addTile(n.id, max - x, y, color, blend, true)
    }
  }
}