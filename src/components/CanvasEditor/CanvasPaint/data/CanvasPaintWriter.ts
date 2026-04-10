import {
  type BinaryMask,
  type Color32,
  fillPixelData,
  fillPixelDataBinaryMask,
  MaskType,
  mutatorBlendBinaryMask, mutatorBlendPixelData,
  PixelWriter,
} from 'pixel-data-js'
import type { Point } from '../../../../lib/node-data-types/BaseDataStructure.ts'
import { getHistory } from '../../../../lib/util/history/history.ts'
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

  function clear(
    x = 0,
    y = 0,
    w = target.w,
    h = target.h,
    maskData: Uint8Array | null = null,
  ) {
    const didChange = accumulator.storeRegionBeforeState(x, y, w, h)

    if (maskData) {
      const mask: BinaryMask = {
        data: maskData,
        type: MaskType.BINARY,
        w,
        h,
      }
      didChange(
        fillPixelDataBinaryMask(target, 0 as Color32, mask, x, y),
      )
    } else {
      didChange(
        fillPixelData(target, 0 as Color32, x, y, w, h),
      )
    }
  }

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
    clear,
    writePoints,
  }
}