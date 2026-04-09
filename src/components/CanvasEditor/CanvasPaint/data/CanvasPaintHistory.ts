import { writePixelDataBuffer } from 'pixel-data-js'
import { getHistory } from '../../../../lib/util/history/history.ts'
import { type Patch, type ProtoPatch } from '../../_core/data/_history-helpers.ts'
import type { CanvasPaintEditorState } from '../CanvasPaintEditorState.ts'
import type { CanvasRenderer } from '../CanvasRenderer.ts'
import type { CanvasPixelAccumulator } from './CanvasPixelAccumulator.ts'

export type ProtoCanvasPatch = ProtoPatch
export type CanvasPatch = Patch

export function applyCanvasPaintAccumulator(
  state: CanvasPaintEditorState,
  accumulator: CanvasPixelAccumulator,
  canvasRenderer: CanvasRenderer,
) {

  const img = state.pixelDataRef.get()!
  const patches = accumulator.toPatches(img)
  accumulator.apply(img)
  const finalPatches = accumulator.finalizePatches(img, patches)

  getHistory().execute({
    do: () => {
      finalPatches.forEach(p => writePixelDataBuffer(img, p.after, p))
      state.imageDataDirty = true
      canvasRenderer.queueRender()
    },
    undo: () => {
      finalPatches.forEach(p => writePixelDataBuffer(img, p.before, p))
      state.imageDataDirty = true
      canvasRenderer.queueRender()
    },
  })

  accumulator.reset()

  return finalPatches
}
