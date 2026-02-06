import type { ImageData } from '@napi-rs/canvas'
import type { Rect } from '../../../../lib/util/data/Rect.ts'

export function extractHistoryPixels(
  imageData: ImageData,
  rect: Rect,
): Uint8ClampedArray

export function extractHistoryPixels(
  imageData: ImageData,
  x: number,
  y: number,
  w: number,
  h: number,
): Uint8ClampedArray
export function extractHistoryPixels(
  imageData: ImageData,
  _x: Rect | number,
  _y?: number,
  _w?: number,
  _h?: number,
): Uint8ClampedArray {
  const { x, y, w, h } = typeof _x === 'object'
    ? _x
    : { x: _x, y: _y!, w: _w!, h: _h! }

  const { width: srcW, data: src } = imageData

  const out = new Uint8ClampedArray(w * h * 4)
  let o = 0

  for (let row = 0; row < h; row++) {
    const srcStart = ((y + row) * srcW + x) * 4
    const srcEnd = srcStart + w * 4
    out.set(src.subarray(srcStart, srcEnd), o)
    o += w * 4
  }

  return out
}

export function applyHistoryPixels(
  imageData: ImageData,
  data: Uint8ClampedArray,
  rect: Rect,
): void

export function applyHistoryPixels(
  imageData: ImageData,
  data: Uint8ClampedArray,
  x: number,
  y: number,
  w: number,
  h: number,
): void
export function applyHistoryPixels(
  imageData: ImageData,
  data: Uint8ClampedArray,
  _x: Rect | number,
  _y?: number,
  _w?: number,
  _h?: number,
): void {
  const { x, y, w, h } = typeof _x === 'object'
    ? _x
    : { x: _x, y: _y!, w: _w!, h: _h! }

  const { width: dstW, data: dst } = imageData

  let o = 0

  for (let row = 0; row < h; row++) {
    const dstStart = ((y + row) * dstW + x) * 4
    dst.set(data.subarray(o, o + w * 4), dstStart)
    o += w * 4
  }
}
