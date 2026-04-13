import { type BlendColor32, type PixelData, PixelWriter } from '../../../../../pixel-data-js/src'
import type { DrawRect } from '../lib/ISelection.ts'
import { blendSheetDrawRect, clearSheetDrawRect } from '../lib/TileGrid-blenders.ts'

export type TileSheetMutator = ReturnType<typeof makeTileSheetMutator>

export function makeTileSheetMutator(
  writer: PixelWriter<any>,
) {
  const target = writer.config.target
  return {
    clearSheetDrawRects(rects: DrawRect[]) {
      for (const r of rects) {
        const didChange = writer.accumulator.storeRegionBeforeState(r.dx, r.dy, r.w, r.h)
        if (!didChange) continue

        didChange(
          clearSheetDrawRect(target, r),
        )
      }
    },
    blendSheetDrawRects(rects: DrawRect[], src: PixelData, blendFn: BlendColor32) {
      for (const r of rects) {
        const didChange = writer.accumulator.storeRegionBeforeState(r.dx, r.dy, r.w, r.h)
        if (!didChange) continue

        didChange(
          blendSheetDrawRect(target, r, src, blendFn),
        )
      }
    },
  }
}