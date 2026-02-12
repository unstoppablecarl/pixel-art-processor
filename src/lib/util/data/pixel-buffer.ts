import type { ImageData } from '@napi-rs/canvas'
import { unpackColorTo } from '../color.ts'
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
  let minX = c0 >>> 16, maxX = minX
  let minY = c0 & 0xFFFF, maxY = minY

  for (let i = 1; i < buf.count; i++) {
    const coords = d[i * stride]
    const x = coords >>> 16
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

export function extractPixelData(
  imageData: ImageData,
  rect: Rect,
): Uint8ClampedArray

export function extractPixelData(
  imageData: ImageData,
  x: number,
  y: number,
  w: number,
  h: number,
): Uint8ClampedArray
export function extractPixelData(
  imageData: ImageData,
  _x: Rect | number,
  _y?: number,
  _w?: number,
  _h?: number,
): Uint8ClampedArray {
  const { x, y, w, h } = typeof _x === 'object'
    ? _x
    : { x: _x, y: _y!, w: _w!, h: _h! }

  const { width: srcW, height: srcH, data: src } = imageData

  const out = new Uint8ClampedArray(w * h * 4)

  const x0 = Math.max(0, x)
  const y0 = Math.max(0, y)
  const x1 = Math.min(srcW, x + w)
  const y1 = Math.min(srcH, y + h)

  // If no intersection, return the empty
  if (x1 <= x0 || y1 <= y0) return out

  for (let row = 0; row < (y1 - y0); row++) {
    // Where to read from the source canvas
    const srcRow = y0 + row
    const srcStart = (srcRow * srcW + x0) * 4
    const rowLen = (x1 - x0) * 4

    // Where to write into the 'out' patch
    const dstRow = (y0 - y) + row
    const dstCol = (x0 - x)
    const dstStart = (dstRow * w + dstCol) * 4

    // Perform the high-speed bulk copy
    out.set(src.subarray(srcStart, srcStart + rowLen), dstStart)
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
  offsetY = 0,
) {
  const data = img.data
  const width = img.width
  const d = buf.data
  const scratchSrc = new Uint8ClampedArray(4)

  for (let i = 0; i < buf.count; i++) {
    const ptr = i * stride
    const coords = d[ptr]
    const rgba = d[ptr + 1]

    const dx = offsetX + (coords >>> 16)
    const dy = offsetY + (coords & 0xFFFF)

    // Bounds check to prevent memory corruption if coords go outside target
    if (dx < 0 || dx >= width || dy < 0 || dy >= (data.length / 4 / width)) continue

    const di = (dy * width + dx) * 4
    const color = unpackColorTo(rgba)
    scratchSrc[0] = color.r
    scratchSrc[1] = color.g
    scratchSrc[2] = color.b
    scratchSrc[3] = color.a

    const blendFn = blendRegistry[d[ptr + 2]]
    getBlendAdapter(blendFn)(scratchSrc, data, 0, di)
  }
}