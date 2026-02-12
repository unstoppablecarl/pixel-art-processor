import { packRGBA, type RGBA } from '../../../../lib/util/color.ts'
import {
  applyBufferToImageData,
  extractPixelData,
  growBufferIfNeeded,
  type PixelBuffer,
  pixelBufferToRect,
} from '../../../../lib/util/data/pixel-buffer.ts'
import { type BlendFn, blendOverwrite } from '../../../../lib/util/html-dom/blit.ts'
import { extractHistoryPixels } from '../../_core/data/_history-helpers.ts'
import { type CanvasPatch, type ProtoCanvasPatch } from './CanvasPaintHistory.ts'

export type CanvasPixelAccumulator = ReturnType<typeof makeCanvasPixelAccumulator>

export function makeCanvasPixelAccumulator() {
  const STRIDE = 3
  const buf: PixelBuffer = {
    data: new Uint32Array(1024 * STRIDE),
    count: 0,
  }

  const blendRegistry: BlendFn[] = []

  // Helper to manage blend function indices
  function getBlendIdx(fn: BlendFn): number {
    let idx = blendRegistry.indexOf(fn)
    if (idx === -1) idx = blendRegistry.push(fn) - 1
    return idx
  }

  function addPixel(x: number, y: number, color: RGBA, blend: BlendFn = blendOverwrite) {
    const packed = packRGBA(color)
    addPixelPacked(x, y, packed, blend)
  }

  /**
   * High-performance path: uses 3 slots per pixel in the buffer
   * [0] : Packed Coords (X << 16 | Y)
   * [1] : Packed Color
   * [2] : Blend Function Index
   */
  function addPixelPacked(x: number, y: number, packedColor: number, blend = blendOverwrite) {
    if (x < 0 || x > 0xFFFF || y < 0 || y > 0xFFFF) return;
    growBufferIfNeeded(buf, STRIDE)
    const offset = buf.count * STRIDE
    buf.data[offset] = (x << 16) | (y & 0xFFFF)
    buf.data[offset + 1] = packedColor
    buf.data[offset + 2] = getBlendIdx(blend)
    buf.count++
  }

  function toPatches(img: ImageData): ProtoCanvasPatch[] {
    const region = pixelBufferToRect(buf, STRIDE)
    if (!region) return []

    // Use the generic extractor for consistency and brevity
    const before = extractPixelData(img, region)

    return [{
      x: region.x,
      y: region.y,
      w: region.w,
      h: region.h,
      before,
      after: null,
    }]
  }

  function apply(img: ImageData) {
    applyBufferToImageData(buf, img, blendRegistry, STRIDE)
  }

  function reset() {
    buf.count = 0
    blendRegistry.length = 0
  }

  function finalizePatches(img: ImageData, patches: ProtoCanvasPatch[]): CanvasPatch[] {
    for (let i = 0; i < patches.length; i++) {
      const p = patches[i]
      p.after = extractHistoryPixels(img, p)
    }
    return patches as CanvasPatch[]
  }

  return {
    addPixel,
    addPixelPacked,
    toPatches,
    apply,
    reset,
    finalizePatches,
  }
}