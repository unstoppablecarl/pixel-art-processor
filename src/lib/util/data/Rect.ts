import type { RectBounds } from './Bounds.ts'

export function trimRectBounds(target: RectBounds, trimTo: RectBounds): RectBounds {
  const nx = Math.max(target.x, trimTo.x)
  const ny = Math.max(target.y, trimTo.y)

  const maxX = Math.min(target.x + target.w, trimTo.x + trimTo.w)
  const maxY = Math.min(target.y + target.h, trimTo.y + trimTo.h)

  const nw = Math.max(0, maxX - nx)
  const nh = Math.max(0, maxY - ny)

  target.x = nx
  target.y = ny
  target.w = nw
  target.h = nh

  return target
}

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


