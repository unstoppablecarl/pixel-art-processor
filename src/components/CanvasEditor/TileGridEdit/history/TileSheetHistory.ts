import type { Rect } from '../../../../lib/util/data/Rect.ts'
import { getHistory } from '../../../../lib/util/history/history.ts'
import type { TileId } from '../../../../lib/wang-tiles/WangTileset.ts'
import type { TileSheet } from '../data/TileSheet.ts'
import type { TileSheetPixelAccumulator } from '../data/TileSheetPixelAccumulator.ts'
import type { TileGridRenderer } from '../renderers/TileGridRenderer.ts'

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

export const TileSheetHistory = {
  apply,
  applyInverse,
  extractPatches,
  extract,
  finalize,
  finalizePatches,
  writeWithHistory,
  applyAccumulator,
}

// capture the pixel region before modification
function extract(
  tileSheet: TileSheet,
  tileId: TileId,
  rect: Rect,
): ProtoTileSheetPatch {
  const before = tileSheet.getHistoryPixels(tileId, rect)
  return {
    tileId,
    ...rect,
    before,
    after: null,
  }
}

// capture the pixel region after modification
function finalize(
  patch: ProtoTileSheetPatch,
  tileSheet: TileSheet,
): TileSheetPatch {
  return {
    ...patch,
    after: tileSheet.getHistoryPixels(patch.tileId, patch),
  }
}

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

// extract patches for multiple regions
function extractPatches(
  tileSheet: TileSheet,
  regions: TileRect[],
) {
  const patches = []
  for (const r of regions) {
    patches.push(
      extract(
        tileSheet,
        r.tileId,
        r,
      ),
    )
  }
  return patches
}

// finalize patches after pixel modifications
function finalizePatches(
  tileSheet: TileSheet,
  patches: (ProtoTileSheetPatch)[],
): TileSheetPatch[] {
  for (let i = 0; i < patches.length; i++) {
    patches[i] = finalize(patches[i], tileSheet)
  }
  return patches as TileSheetPatch[]
}

function writeWithHistory(
  tileSheet: TileSheet,
  opts: {
    getRegions: () => TileRect[],
    write: () => void
  }) {
  const regions = opts.getRegions()
  const patches = extractPatches(tileSheet, regions)
  opts.write()
  const finalPatches = finalizePatches(tileSheet, patches)
  getHistory().execute({
    do: () => finalPatches.forEach(p => apply(tileSheet, p)),
    undo: () => finalPatches.forEach(p => applyInverse(tileSheet, p)),
  })
  return finalPatches
}

function applyAccumulator(
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
        TileSheetHistory.apply(tileSheet, p)
      })
    },
    undo: () => {
      finalPatches.forEach(p => {
        gridRenderer.queueRenderTile(p.tileId)
        TileSheetHistory.applyInverse(tileSheet, p)
      })
    },
  })

  accumulator.reset()

  return finalPatches
}