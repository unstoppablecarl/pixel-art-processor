import {
  type AlphaMask,
  applyAlphaMaskToPixelData,
  type BinaryMask,
  type BlendColor32,
  blendPixelData,
  blendPixelDataAlphaMask,
  blendPixelDataBinaryMask,
  type Color32,
  ColorPaintBuffer,
  commitColorPaintBuffer,
  fillPixelData,
  fillPixelDataBinaryMask,
  makeColorPaintBufferCanvasRenderer,
  makePixelTile,
  MaskType,
  type NullableMaskRect,
  type PixelData,
  PixelWriter,
  sourceOverPerfect,
  TilePool,
} from 'pixel-data-js'
import { getHistory } from '../../../lib/util/history/history.ts'
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

  function withHistory(cb: (mutator: CanvasPaintMutator) => void) {
    writer.withHistory(cb, after, after)
    after()
  }

  const pool = new TilePool(256, makePixelTile)
  const paintBuffer = new ColorPaintBuffer(writer.config, pool)
  const paintBufferRenderer = makeColorPaintBufferCanvasRenderer(paintBuffer)

  return {
    paintBuffer,
    paintBufferRenderer,
    paintBufferCommit(
      alpha = 255,
      blendFn = sourceOverPerfect,
    ) {
      withHistory(() => {
        commitColorPaintBuffer(
          writer.accumulator,
          paintBuffer,
          alpha,
          blendFn,
          blendPixelData,
        )
      })
      paintBuffer.clear()
    },
    withHistory,
  }
}

export type CanvasPaintMutator = ReturnType<typeof makeCanvasPaintMutator>

function makeCanvasPaintMutator(writer: PixelWriter<any>) {

  const target = writer.config.target
  const accumulator = writer.accumulator

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
  }
}