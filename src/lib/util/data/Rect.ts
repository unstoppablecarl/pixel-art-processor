import { sliceMask } from '../../../components/CanvasEditor/TileGridEdit/data/TileGridGeometry.ts'
import type { SelectionRect } from '../../../components/CanvasEditor/TileGridEdit/lib/ISelection.ts'

export type Rect = { x: number; y: number; w: number; h: number }

export function trimRectBounds<T extends Rect | SelectionRect>(target: T, trimTo: Rect): T {
  // Store original values to calculate relative offsets for the mask slice
  const oldX = target.x
  const oldY = target.y
  const oldW = target.w

  const nx = Math.max(target.x, trimTo.x)
  const ny = Math.max(target.y, trimTo.y)

  const maxX = Math.min(target.x + target.w, trimTo.x + trimTo.w)
  const maxY = Math.min(target.y + target.h, trimTo.y + trimTo.h)

  const nw = Math.max(0, maxX - nx)
  const nh = Math.max(0, maxY - ny)

  // Calculate offsets within the original mask
  const offsetX = nx - oldX
  const offsetY = ny - oldY

  target.x = nx
  target.y = ny
  target.w = nw
  target.h = nh

  if ('mask' in target && target.mask) {
    target.mask = sliceMask(target.mask, offsetX, offsetY, nw, nh, oldW)
  }

  return target
}

export function getRectsBounds(rects: Rect[]): Rect {
  if (rects.length === 1) return { ...rects[0] }
  let minX = Infinity, minY = Infinity
  let maxX = -Infinity, maxY = -Infinity

  for (let i = 0; i < rects.length; i++) {
    const r = rects[i]
    const x1 = r.x
    const y1 = r.y
    const x2 = x1 + r.w
    const y2 = y1 + r.h

    if (x1 < minX) minX = x1
    if (y1 < minY) minY = y1
    if (x2 > maxX) maxX = x2
    if (y2 > maxY) maxY = y2
  }

  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}


