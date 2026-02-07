import RGBA = tinycolor.ColorFormats.RGBA
import { type BlendFn, getBlendAdapter } from '../../../../lib/util/html-dom/blit.ts'
import type { PixelBlend, PixelColor } from '../../../../lib/util/html-dom/ImageData.ts'
import { type ProtoCanvasPatch } from './CanvasPaintHistory.ts'

export type CanvasPixelAccumulator = ReturnType<typeof makeCanvasPixelAccumulator>

export function makeCanvasPixelAccumulator() {

  let width = 1_000_000

  function setWidth(val: number) {
    width = val
  }

  // Map<key, PixelColor>
  // key = y * width + x
  const pixelWrites = new Map<number, PixelColor>()
  const pixelBlends = new Map<number, PixelBlend>()

  // bounding box of all writes
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  function trackBounds(x: number, y: number) {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }

  function addPixel(x: number, y: number, color: RGBA) {
    const key = y * width + x // or width, but width not known yet
    pixelWrites.set(key, { x, y, color })
    trackBounds(x, y)
  }

  function addPixelBlend(x: number, y: number, color: RGBA, blend: BlendFn) {
    const key = y * width + x
    pixelBlends.set(key, { x, y, color, blend })
    trackBounds(x, y)
  }

  function getRegion() {
    if (pixelWrites.size === 0 && pixelBlends.size === 0) return null
    return {
      x: minX,
      y: minY,
      w: maxX - minX + 1,
      h: maxY - minY + 1,
    }
  }

  function toPatches(img: ImageData): ProtoCanvasPatch[] {
    const region = getRegion()
    if (!region) return []

    const { x, y, w, h } = region
    const before = new Uint8ClampedArray(w * h * 4)

    for (let iy = 0; iy < h; iy++) {
      for (let ix = 0; ix < w; ix++) {
        const di = ((y + iy) * img.width + (x + ix)) * 4
        const si = (iy * w + ix) * 4

        before[si] = img.data[di]
        before[si + 1] = img.data[di + 1]
        before[si + 2] = img.data[di + 2]
        before[si + 3] = img.data[di + 3]
      }
    }

    return [{
      x, y, w, h,
      before,
      after: null,
    }]
  }

  function apply(img: ImageData) {
    const data = img.data
    const scratch = new Uint8ClampedArray(4)

    // solids
    for (const { x, y, color } of pixelWrites.values()) {
      const di = (y * img.width + x) * 4
      data[di] = color.r
      data[di + 1] = color.g
      data[di + 2] = color.b
      data[di + 3] = color.a
    }

    // blends
    for (const { x, y, color, blend } of pixelBlends.values()) {
      const di = (y * img.width + x) * 4
      const byteBlend = getBlendAdapter(blend)

      scratch[0] = color.r
      scratch[1] = color.g
      scratch[2] = color.b
      scratch[3] = color.a

      byteBlend(scratch, data, 0, di)
    }
  }

  function reset() {
    pixelWrites.clear()
    pixelBlends.clear()
    minX = Infinity
    minY = Infinity
    maxX = -Infinity
    maxY = -Infinity
  }

  return {
    addPixel,
    addPixelBlend,
    toPatches,
    apply,
    reset,
    getRegion,
    setWidth,
  }
}

