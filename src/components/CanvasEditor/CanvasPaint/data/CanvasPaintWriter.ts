import type { Point } from '../../../../lib/node-data-types/BaseDataStructure.ts'
import type { BlendFn } from '../../../../lib/util/html-dom/blit.ts'
import { type PixelColor, type RGBA, RGBA_ERASE } from '../../../../lib/util/html-dom/ImageData.ts'
import type { ImageDataRef } from '../../../../lib/vue/vue-image-data.ts'
import type { CanvasPaintEditorState } from '../CanvasPaintEditorState.ts'
import type { CanvasRenderer } from '../CanvasRenderer.ts'
import { applyCanvasPaintAccumulator } from './CanvasPaintHistory.ts'
import { type CanvasPixelAccumulator, makeCanvasPixelAccumulator } from './CanvasPixelAccumulator.ts'

export type CanvasPaintWriter = ReturnType<typeof makeCanvasPaintWriter>

export function makeCanvasPaintWriter(
  {
    state,
    canvasRenderer,
  }: {
    state: CanvasPaintEditorState,
    canvasRenderer: CanvasRenderer
  }) {
  const { imageDataRef } = state
  const accumulator = makeCanvasPixelAccumulator()
  const mutator = makeCanvasPaintMutator({ imageDataRef, accumulator })

  return {
    withHistory(cb: (mutator: CanvasPaintMutator) => void) {
      accumulator.setWidth(imageDataRef.width)
      cb(mutator)
      state.imageDataDirty = true
      canvasRenderer.queueRender()
      return applyCanvasPaintAccumulator(imageDataRef.get()!, accumulator)
    },
  }
}

export type CanvasPaintMutator = ReturnType<typeof makeCanvasPaintMutator>

function makeCanvasPaintMutator(
  {
    imageDataRef,
    accumulator,
  }: {
    imageDataRef: ImageDataRef,
    accumulator: CanvasPixelAccumulator,
  }) {

  function blendImageData(
    src: ImageData,
    blendFn: BlendFn,
    opts: {
      dx?: number
      dy?: number
      sx?: number
      sy?: number
      sw?: number
      sh?: number
    } = {},
  ) {
    const dx = opts.dx ?? 0
    const dy = opts.dy ?? 0
    const sx0 = opts.sx ?? 0
    const sy0 = opts.sy ?? 0
    const w = opts.sw ?? src.width
    const h = opts.sh ?? src.height

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const si = ((sy0 + y) * src.width + (sx0 + x)) * 4

        const color = {
          r: src.data[si],
          g: src.data[si + 1],
          b: src.data[si + 2],
          a: src.data[si + 3],
        }

        accumulator.addPixelBlend(dx + x, dy + y, color, blendFn)
      }
    }
  }

  function clear(
    x = 0,
    y = 0,
    w = imageDataRef.get()!.width,
    h = imageDataRef.get()!.height,
    mask: Uint8Array | null = null,
  ) {
    for (let iy = 0; iy < h; iy++) {
      for (let ix = 0; ix < w; ix++) {

        if (mask) {
          const maskIndex = iy * w + ix
          if (!mask[maskIndex]) continue
        }

        accumulator.addPixel(x + ix, y + iy, RGBA_ERASE)
      }
    }
  }

  function writePixels(
    pixels: PixelColor[],
  ) {
    for (let i = 0; i < pixels.length; i++) {
      const p = pixels[i]
      accumulator.addPixel(p.x, p.y, p.color)
    }
  }

  function writePoints(
    points: Point[],
    color: RGBA,
  ) {
    for (let i = 0; i < points.length; i++) {
      const p = points[i]
      accumulator.addPixel(p.x, p.y, color)
    }
  }

  return {
    blendImageData,
    clear,
    writePixels,
    writePoints,
  }
}