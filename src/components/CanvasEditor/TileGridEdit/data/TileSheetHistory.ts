import type { Rect } from '../../../../lib/util/data/Rect.ts'
import { getHistory } from '../../../../lib/util/history/history.ts'
import type { TileId } from '../../../../lib/wang-tiles/WangTileset.ts'
import type { TileGridRenderer } from '../renderers/TileGridRenderer.ts'
import type { TileSheet } from './TileSheet.ts'
import type { TileSheetPixelAccumulator } from './TileSheetPixelAccumulator.ts'

export type ProtoTileSheetPatch = {
  tileId: TileId
  x: number
  y: number
  w: number
  h: number
  before: Uint8ClampedArray
  after: Uint8ClampedArray | null
}

export type TileSheetPatch = Omit<ProtoTileSheetPatch, 'after'> & {
  after: Uint8ClampedArray
}

export type TileRect = Rect & { tileId: TileId }

// apply the "after" pixels (redo)
function apply(
  tileSheet: TileSheet,
  patch: TileSheetPatch,
) {
  tileSheet.setHistoryPixels(
    patch.tileId,
    patch.after,
    patch,
  )
}

// apply the "before" pixels (undo)
function applyInverse(
  tileSheet: TileSheet,
  patch: TileSheetPatch,
) {
  tileSheet.setHistoryPixels(
    patch.tileId,
    patch.before,
    patch,
  )
}

export function applyTileSheetAccumulator(
  tileSheet: TileSheet,
  gridRenderer: TileGridRenderer,
  accumulator: TileSheetPixelAccumulator,
) {
  const patches = accumulator.toPatches(tileSheet)
  accumulator.apply(tileSheet)
  const finalPatches = accumulator.finalizePatches(tileSheet, patches)

  getHistory().execute({
    do: () => {
      finalPatches.forEach(p => {
        gridRenderer.queueRenderTile(p.tileId)
        apply(tileSheet, p)
      })
    },
    undo: () => {
      finalPatches.forEach(p => {
        gridRenderer.queueRenderTile(p.tileId)
        applyInverse(tileSheet, p)
      })
    },
  })

  accumulator.reset()

  return finalPatches
}