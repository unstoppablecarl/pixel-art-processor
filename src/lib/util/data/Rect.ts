import type { RectBounds } from './Bounds.ts'

export function getRectsBounds(rects: RectBounds[]): RectBounds {
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

