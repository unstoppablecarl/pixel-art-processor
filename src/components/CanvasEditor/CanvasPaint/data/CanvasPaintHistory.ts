import { getHistory } from '../../../../lib/util/history/history.ts'
import { applyHistoryPixels, type Patch, type ProtoPatch } from '../../_core/data/_history-helpers.ts'
import type { CanvasPixelAccumulator } from './CanvasPixelAccumulator.ts'

export type ProtoCanvasPatch = ProtoPatch
export type CanvasPatch = Patch

export function applyCanvasPaintAccumulator(
  img: ImageData,
  accumulator: CanvasPixelAccumulator,
) {
  const patches = accumulator.toPatches(img)
  accumulator.apply(img)
  const finalPatches = accumulator.finalizePatches(img, patches)

  getHistory().execute({
    do: () => finalPatches.forEach(p => applyHistoryPixels(img, p.after, p)),
    undo: () => finalPatches.forEach(p => applyHistoryPixels(img, p.before, p)),
  })

  accumulator.reset()

  return finalPatches
}
