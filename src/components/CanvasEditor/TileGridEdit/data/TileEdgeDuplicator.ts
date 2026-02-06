import type { Point } from '../../../../lib/node-data-types/BaseDataStructure.ts'
import type { Direction } from '../../../../lib/pipeline/_types.ts'
import { type TileId } from '../../../../lib/wang-tiles/WangTileset.ts'
import type { TileSheet } from './TileSheet.ts'
import type { TileSheetPixelAccumulator } from './TileSheetPixelAccumulator.ts'

// cache edge pixel lists by (tileSize, borderThickness)
const edgePixelCache = new Map<string, Record<Direction, Point[]>>()

function getEdgePixels(tileSize: number, borderThickness: number) {
  borderThickness = Math.min(borderThickness, tileSize)
  const key = tileSize + ':' + borderThickness

  const cached = edgePixelCache.get(key)
  if (cached) return cached

  const N = []
  const S = []
  const E = []
  const W = []

  // north rows
  for (let y = 0; y < borderThickness; y++) {
    for (let x = 0; x < tileSize; x++) {
      N.push({ x, y })
    }
  }

  // south rows
  for (let y = tileSize - borderThickness; y < tileSize; y++) {
    for (let x = 0; x < tileSize; x++) {
      S.push({ x, y })
    }
  }

  // west columns
  for (let x = 0; x < borderThickness; x++) {
    for (let y = 0; y < tileSize; y++) {
      W.push({ x, y })
    }
  }

  // east columns
  for (let x = tileSize - borderThickness; x < tileSize; x++) {
    for (let y = 0; y < tileSize; y++) {
      E.push({ x, y })
    }
  }

  const result = { N, S, E, W }
  edgePixelCache.set(key, result)
  return result
}

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
  const tileSize = tileSheet.tileSize
  const tileset = tileSheet.tileset
  const tile = tileset.byId.get(tileId)
  if (!tile) return

  const edges = getEdgePixels(tileSize, borderThickness)
  const offset = tileSheet.getTileSheetOffset(tileId)
  const img = tileSheet.imageData
  const data = img.data
  const max = tileSize - 1

  // scratch RGBA reused for all pixels
  const scratch = { r: 0, g: 0, b: 0, a: 0 }

  function readPixel(sx: number, sy: number) {
    const di = (sy * img.width + sx) * 4
    scratch.r = data[di]
    scratch.g = data[di + 1]
    scratch.b = data[di + 2]
    scratch.a = data[di + 3]
  }

  for (const edge of ['N', 'S', 'E', 'W'] as const) {
    const { sameEdge, mirroredEdge } = tileset.getTilesWithSameEdge(tile, edge)
    const pts = edges[edge]

    if (sameEdge.length === 0 && mirroredEdge.length === 0) continue

    // same orientation
    for (let i = 0; i < sameEdge.length; i++) {
      const tid = sameEdge[i].id

      for (let p = 0; p < pts.length; p++) {
        const pt = pts[p]
        const sx = offset.x + pt.x
        const sy = offset.y + pt.y

        readPixel(sx, sy)
        accumulator.addTile(tid, pt.x, pt.y, { r: scratch.r, g: scratch.g, b: scratch.b, a: scratch.a })
      }
    }

    // mirrored orientation
    for (let i = 0; i < mirroredEdge.length; i++) {
      const tid = mirroredEdge[i].id

      for (let p = 0; p < pts.length; p++) {
        const pt = pts[p]
        const sx = offset.x + pt.x
        const sy = offset.y + pt.y

        readPixel(sx, sy)

        let mx = pt.x
        let my = pt.y

        if (edge === 'N' || edge === 'S') {
          mx = max - pt.x
        } else {
          my = max - pt.y
        }

        accumulator.addTile(tid, mx, my, {
          r: scratch.r,
          g: scratch.g,
          b: scratch.b,
          a: scratch.a,
        })
      }
    }
  }
}
