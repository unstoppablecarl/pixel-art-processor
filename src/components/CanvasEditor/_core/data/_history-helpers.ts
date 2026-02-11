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

export type ProtoPatch = {
  x: number
  y: number
  w: number
  h: number
  before: Uint8ClampedArray
  after: Uint8ClampedArray | null
}

export type Patch = Omit<ProtoPatch, 'after'> & {
  after: Uint8ClampedArray
}

export function finalizePatch<
  Proto extends ProtoPatch,
  P extends Patch
>
(p: Proto, img: ImageData, offsetX = 0, offsetY = 0): P {
  const after = new Uint8ClampedArray(p.w * p.h * 4)

  for (let iy = 0; iy < p.h; iy++) {
    for (let ix = 0; ix < p.w; ix++) {
      const di = ((p.y + offsetY + iy) * img.width + (p.x + offsetX + ix)) * 4
      const si = (iy * p.w + ix) * 4

      after[si] = img.data[di]
      after[si + 1] = img.data[di + 1]
      after[si + 2] = img.data[di + 2]
      after[si + 3] = img.data[di + 3]
    }
  }

  p.after = after

  return p as unknown as P
}