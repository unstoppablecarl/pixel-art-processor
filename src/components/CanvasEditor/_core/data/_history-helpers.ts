import { extractPixelData } from '../../../../lib/util/data/pixel-buffer.ts'
import type { Rect } from '../../../../lib/util/data/Rect.ts'

export const extractHistoryPixels = extractPixelData

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
  const { x, y, w, h } = typeof _x === 'object' ? _x : { x: _x, y: _y!, w: _w!, h: _h! }

  const { width: dstW, height: dstH, data: dst } = imageData

  // 1. Calculate the intersection of the patch and the canvas
  const x0 = Math.max(0, x)
  const y0 = Math.max(0, y)
  const x1 = Math.min(dstW, x + w)
  const y1 = Math.min(dstH, y + h)

  // If the intersection is empty, do nothing
  if (x1 <= x0 || y1 <= y0) return

  for (let row = 0; row < (y1 - y0); row++) {
    // Canvas target index
    const dstStart = ((y0 + row) * dstW + x0) * 4

    // Source data index (must account for the offset if the rect was partially OOB)
    const srcRow = (y0 - y) + row
    const srcCol = (x0 - x)
    const o = (srcRow * w + srcCol) * 4

    const rowLen = (x1 - x0) * 4

    // Safety check for source buffer length
    if (o + rowLen <= data.length) {
      dst.set(data.subarray(o, o + rowLen), dstStart)
    }
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

export function finalizePatch<Proto extends ProtoPatch, P extends Patch>(
  p: Proto,
  img: ImageData,
  offsetX = 0,
  offsetY = 0,
): P {
  p.after = extractPixelData(img, {
    x: p.x + offsetX,
    y: p.y + offsetY,
    w: p.w,
    h: p.h,
  })

  return p as unknown as P
}