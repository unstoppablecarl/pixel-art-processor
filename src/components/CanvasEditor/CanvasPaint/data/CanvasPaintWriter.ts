import {
  type Color32,
  mutatorBlendBinaryMask,
  mutatorBlendPixelData,
  type NullableMaskRect,
  PixelWriter,
} from 'pixel-data-js'
import type { Point } from '../../../../lib/node-data-types/BaseDataStructure.ts'
import { getHistory } from '../../../../lib/util/history/history.ts'
import { clearSelectionRect } from '../../_core/blenders.ts'
import type { CanvasPaintEditorState } from '../CanvasPaintEditorState.ts'
import type { CanvasRenderer } from '../CanvasRenderer.ts'

export type CanvasPaintWriter = ReturnType<typeof makeCanvasPaintWriter>

export function makeCanvasPaintWriter(
  {
    state,
    canvasRenderer,
  }: {
    state: CanvasPaintEditorState,
    canvasRenderer: CanvasRenderer
  }) {

  const writer = new PixelWriter(state.pixelDataRef.get()!, makeCanvasPaintMutator, {
    historyManager: getHistory(),
  })

  return {
    withHistory(cb: (mutator: CanvasPaintMutator) => void) {
      writer.withHistory(cb)
      state.imageDataDirty = true
      canvasRenderer.queueRender()
    },
  }
}

export type CanvasPaintMutator = ReturnType<typeof makeCanvasPaintMutator>

function makeCanvasPaintMutator(writer: PixelWriter<any>) {

  const target = writer.config.target
  const accumulator = writer.accumulator

  function writePoints(points: Point[], color: Color32) {
    for (let i = 0; i < points.length; i++) {
      const { x, y } = points[i]
      const index = y * target.w + x

      const current = target.data[index]
      if (current !== color) {
        accumulator.storePixelBeforeState(x, y)
        target.data[index] = color
      }
    }
  }

  return {
    ...mutatorBlendBinaryMask(writer),
    ...mutatorBlendPixelData(writer),
    clearSelectionRect(sel: NullableMaskRect) {
      const didChange = accumulator.storeRegionBeforeState(sel.x, sel.y, sel.w, sel.h)
      didChange(
        clearSelectionRect(target, sel),
      )
    },
    writePoints,
  }
}