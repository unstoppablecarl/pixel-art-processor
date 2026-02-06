import type { Rect } from '../../../../lib/util/data/Rect.ts'
import type { TileId } from '../../../../lib/wang-tiles/WangTileset.ts'
import type { TileSheet } from '../data/TileSheet.ts'

export type TileSheetPatch = {
  tileId: TileId
  x: number
  y: number
  w: number
  h: number
  before: Uint8ClampedArray
  after: Uint8ClampedArray
}

export const TileSheetHistory = {
  apply,
  applyInverse,
  extractPatches,
  extract,
  finalize,
  finalizePatches,
}

// capture the pixel region before modification
function extract(
  tileSheet: TileSheet,
  tileId: TileId,
  rect: Rect,
): Omit<TileSheetPatch, 'after'> & { after: Uint8ClampedArray | null } {
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
  patch: Omit<TileSheetPatch, 'after'> & { after: Uint8ClampedArray | null },
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

type TileRect = Rect & { tileId: TileId }

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
  patches: (Omit<TileSheetPatch, 'after'> & { after: Uint8ClampedArray | null })[],
): TileSheetPatch[] {
  for (let i = 0; i < patches.length; i++) {
    patches[i] = finalize(patches[i], tileSheet)
  }
  return patches as TileSheetPatch[]
}