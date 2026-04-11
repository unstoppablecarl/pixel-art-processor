import {
  type AlphaMask,
  applyAlphaMaskToPixelData,
  type BinaryMask,
  type BlendColor32,
  blendPixelData,
  blendPixelDataAlphaMask,
  blendPixelDataBinaryMask,
  type Color32,
  fillPixelData,
  fillPixelDataBinaryMask,
  MaskType,
  type NullableMaskRect,
  type PixelData,
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

  const after = () => {
    state.imageDataDirty = true
    canvasRenderer.queueRender()
  }

  return {
    withHistory(cb: (mutator: CanvasPaintMutator) => void) {
      writer.withHistory(cb, after, after)
      after()
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
    clearSelectionRect(sel: NullableMaskRect) {
      const didChange = accumulator.storeRegionBeforeState(sel.x, sel.y, sel.w, sel.h)
      if (!didChange) return false
      let result = false
      if (sel.data) {
        if (sel.type === MaskType.BINARY) {
          result = fillPixelDataBinaryMask(target, 0 as Color32, sel as BinaryMask, sel.x, sel.y)
        } else {
          result = applyAlphaMaskToPixelData(target, sel as AlphaMask, { invertMask: true })
        }
      } else {
        result = fillPixelData(target, 0 as Color32, sel)
      }

      didChange(result)
    },
    blendSelectionRect(sel: NullableMaskRect, pixels: PixelData, blendFn: BlendColor32) {

      const didChange = accumulator.storeRegionBeforeState(sel.x, sel.y, sel.w, sel.h)
      if (!didChange) return false
      let result = false
      if (sel.data) {
        const opts = {
          x: sel.x,
          y: sel.y,
          blendFn,
        }
        if (sel.type === MaskType.BINARY) {
          result = blendPixelDataBinaryMask(target, pixels, sel as BinaryMask, opts)
        } else {
          result = blendPixelDataAlphaMask(target, pixels, sel as AlphaMask, opts)
        }
      } else {
        const opts = {
          x: sel.x,
          y: sel.y,
          w: sel.w,
          h: sel.h,
          blendFn,
        }
        result = blendPixelData(target, pixels, opts)
      }

      didChange(result)
    },
    writePoints,
  }
}