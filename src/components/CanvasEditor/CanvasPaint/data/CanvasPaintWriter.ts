import type { Point } from '../../../../lib/node-data-types/BaseDataStructure.ts'
import type { PixelColor, RGBA } from '../../../../lib/util/data/color.ts'
import type { BlendFn, BlendImageDataOptions } from '../../../../lib/util/html-dom/blit.ts'
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
      cb(mutator)
      const finalPatches = applyCanvasPaintAccumulator(state, accumulator, canvasRenderer)
      state.imageDataDirty = true
      canvasRenderer.queueRender()

      return finalPatches
    },
  }
}

export type CanvasPaintMutator = ReturnType<typeof makeCanvasPaintMutator>
const PACKED_ERASE = 0x00000000

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
    opts: Omit<BlendImageDataOptions, 'blendMode'>,
  ) {
    const dx = opts.dx ?? 0
    const dy = opts.dy ?? 0
    const sx0 = opts.sx ?? 0
    const sy0 = opts.sy ?? 0
    const w = opts.sw ?? src.width
    const h = opts.sh ?? src.height
    const mask = opts.mask ?? null

    // View source data as 32-bit integers for faster extraction
    const src32 = new Uint32Array(src.data.buffer)

    for (let y = 0; y < h; y++) {
      const srcY = sy0 + y
      const srcYBase = srcY * src.width
      const destY = dy + y

      for (let x = 0; x < w; x++) {
        const srcX = sx0 + x
        const srcIdx = srcYBase + srcX

        // 1. Mask Check
        if (mask && !mask[srcIdx]) continue

        // 2. Direct 32-bit read (Packed Color)
        const packedColor = src32[srcIdx]

        // 3. High-perf add
        accumulator.addPixelPacked(dx + x, destY, packedColor, blendFn)
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
      const destY = y + iy
      const maskRowOffset = iy * w

      for (let ix = 0; ix < w; ix++) {
        if (mask && !mask[maskRowOffset + ix]) continue

        accumulator.addPixelPacked(x + ix, destY, PACKED_ERASE)
      }
    }
  }

  function writePixels(pixels: PixelColor[]) {
    for (let i = 0; i < pixels.length; i++) {
      const p = pixels[i]
      const c = p.color
      const packed = (c.r << 24) | (c.g << 16) | (c.b << 8) | (c.a >>> 0)
      accumulator.addPixelPacked(p.x, p.y, packed)
    }
  }

  function writePoints(points: Point[], color: RGBA) {
    // Pre-pack the color once before the loop
    const packed = (color.r << 24) | (color.g << 16) | (color.b << 8) | (color.a >>> 0)
    for (let i = 0; i < points.length; i++) {
      const p = points[i]
      accumulator.addPixelPacked(p.x, p.y, packed)
    }
  }

  return {
    blendImageData,
    clear,
    writePixels,
    writePoints,
  }
}