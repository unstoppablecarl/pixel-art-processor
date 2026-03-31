import type { PixelData } from 'pixel-data-js'
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

export function applyBufferToPixelData(
  buf: PixelBuffer,
  img: PixelData,
  blendRegistry: BlendFn[],
  stride: number,
  offsetX = 0,
  offsetY = 0,
) {
  const width = img.width
  const height = img.height
  const d = buf.data

  for (let i = 0; i < buf.count; i++) {
    const ptr = i * stride
    const coords = d[ptr]
    const rgba = d[ptr + 1]

    const dx = offsetX + (coords >>> 16)
    const dy = offsetY + (coords & 0xFFFF)

    // Bounds check using 32-bit dimensions
    if (dx < 0 || dx >= width || dy < 0 || dy >= height) {
      continue
    }

    const di = dy * width + dx
    const blendIdx = d[ptr + 2]
    const blendFn = blendRegistry[blendIdx]

    // Use a 32-bit adapter if available, or convert the uint32 back to 8-bit for legacy blenders
    // Note: If your getBlendAdapter only supports 8-bit, it will need a temporary view or update.
    const adapter = getBlendAdapter(blendFn)

    // We pass the 32-bit values directly if the adapter supports it,
    // otherwise we use a small Uint32Array to bridge the data.
    const srcPixel = new Uint32Array([rgba])
    adapter(
      new Uint8ClampedArray(srcPixel.buffer),
      img.imageData.data,
      0,
      di * 4,
    )
  }
}