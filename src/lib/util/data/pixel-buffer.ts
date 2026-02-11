import { type BlendFn, getBlendAdapter } from '../html-dom/blit.ts'
import type { Rect } from './Rect.ts'

export type PixelBuffer = {
  data: Uint32Array
  count: number
}

export function pixelBufferToRect(buf: PixelBuffer, stride: number): Rect | null {
  if (buf.count === 0) return null
  const d = buf.data

  let c0 = d[0]
  let minX = c0 >> 16, maxX = minX
  let minY = c0 & 0xFFFF, maxY = minY

  for (let i = 1; i < buf.count; i++) {
    const coords = d[i * stride]
    const x = coords >> 16
    const y = coords & 0xFFFF

    if (x < minX) {
      minX = x
    } else if (x > maxX) {
      maxX = x
    }
    if (y < minY) {
      minY = y
    } else if (y > maxY) {
      maxY = y
    }
  }

  return {
    x: minX,
    y: minY,
    w: maxX - minX + 1,
    h: maxY - minY + 1,
  }
}

export function growBufferIfNeeded(buf: PixelBuffer, stride: number) {
  if ((buf.count + 1) * stride > buf.data.length) {
    const next = new Uint32Array(buf.data.length * 2)
    next.set(buf.data)
    buf.data = next
  }
}
export function extractImageDataRect(img: ImageData, rect: Rect): Uint8ClampedArray {
  const { x, y, w, h } = rect
  const out = new Uint8ClampedArray(w * h * 4)
  const data = img.data
  const width = img.width

  for (let iy = 0; iy < h; iy++) {
    const rowStart = (y + iy) * width
    for (let ix = 0; ix < w; ix++) {
      const di = (rowStart + (x + ix)) * 4
      const si = (iy * w + ix) * 4

      out[si]     = data[di]
      out[si + 1] = data[di + 1]
      out[si + 2] = data[di + 2]
      out[si + 3] = data[di + 3]
    }
  }
  return out
}

/**
 * The "Hot Loop": Applies the accumulated buffer to the actual ImageData.
 */
export function applyBufferToImageData(
  buf: PixelBuffer,
  img: ImageData,
  blendRegistry: BlendFn[],
  stride: number,
  offsetX = 0,
  offsetY = 0
) {
  const data = img.data
  const width = img.width
  const d = buf.data
  const scratchSrc = new Uint8ClampedArray(4)

  for (let i = 0; i < buf.count; i++) {
    const ptr = i * stride
    const coords = d[ptr]
    const rgba = d[ptr + 1]

    const dx = offsetX + (coords >> 16)
    const dy = offsetY + (coords & 0xFFFF)

    // Bounds check to prevent memory corruption if coords go outside target
    if (dx < 0 || dx >= width || dy < 0 || dy >= (data.length / 4 / width)) continue

    const di = (dy * width + dx) * 4

    scratchSrc[0] = (rgba >> 24) & 0xFF
    scratchSrc[1] = (rgba >> 16) & 0xFF
    scratchSrc[2] = (rgba >> 8) & 0xFF
    scratchSrc[3] = rgba & 0xFF

    const blendFn = blendRegistry[d[ptr + 2]]
    getBlendAdapter(blendFn)(scratchSrc, data, 0, di)
  }
}