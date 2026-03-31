import { extractPixelDataBuffer, type PixelData } from 'pixel-data-js'
import type { Rect } from '../../../../lib/util/data/Rect.ts'

export function applyHistoryToPixelData(
  pixelData: PixelData,
  data: Uint32Array,
  rect: Rect,
): void
export function applyHistoryToPixelData(
  pixelData: PixelData,
  data: Uint32Array,
  x: number,
  y: number,
  w: number,
  h: number,
): void
export function applyHistoryToPixelData(
  pixelData: PixelData,
  data: Uint32Array,
  _x: Rect | number,
  _y?: number,
  _w?: number,
  _h?: number,
): void {
  const { x, y, w, h } = typeof _x === 'object'
    ? _x
    : { x: _x, y: _y!, w: _w!, h: _h! }

  const dstW = pixelData.width
  const dstH = pixelData.height
  const dst = pixelData.data32
  const src = data

  // 1. Calculate the intersection of the patch and the canvas
  const x0 = Math.max(0, x)
  const y0 = Math.max(0, y)
  const x1 = Math.min(dstW, x + w)
  const y1 = Math.min(dstH, y + h)

  // If the intersection is empty, do nothing
  if (x1 <= x0 || y1 <= y0) {
    return
  }

  const copyWidth = x1 - x0
  const copyHeight = y1 - y0

  for (let row = 0; row < copyHeight; row++) {
    // 32-bit Target index calculation
    const dstRow = y0 + row
    const dstStart = dstRow * dstW + x0

    // 32-bit Source index calculation (accounts for partial OOB offset)
    const srcRow = (y0 - y) + row
    const srcCol = (x0 - x)
    const srcStart = srcRow * w + srcCol

    // High-speed 32-bit bulk copy
    const chunk = src.subarray(srcStart, srcStart + copyWidth)
    dst.set(chunk, dstStart)
  }
}

export type ProtoPatch = {
  x: number
  y: number
  w: number
  h: number
  before: Uint32Array
  after: Uint32Array | null
}

export type Patch = Omit<ProtoPatch, 'after'> & {
  after: Uint32Array
}

export function finalizePatch<Proto extends ProtoPatch, P extends Patch>(
  p: Proto,
  img: PixelData,
  offsetX = 0,
  offsetY = 0,
): P {
  // Assuming extractPixelData now returns Uint32Array as discussed
  p.after = extractPixelDataBuffer(img, {
    x: p.x + offsetX,
    y: p.y + offsetY,
    w: p.w,
    h: p.h,
  })

  return p as unknown as P
}