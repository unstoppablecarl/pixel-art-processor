import { getRectsBounds, type Rect } from '../../../../lib/util/data/Rect.ts'
import type { SelectionRect } from './ISelection.ts'

/**
 * Two rects are adjacent if they touch exactly along an edge.
 * Works for clipped rects that live inside a single tile.
 */
function areAdjacent(a: Rect, b: Rect): boolean {
  const ax2 = a.x + a.w
  const ay2 = a.y + a.h
  const bx2 = b.x + b.w
  const by2 = b.y + b.h

  // Horizontal adjacency: share a vertical edge
  const horizontal =
    a.y < by2 &&
    ay2 > b.y &&
    (ax2 === b.x || bx2 === a.x)
  if (horizontal) return true

  // Vertical adjacency: share a horizontal edge
  const vertical =
    a.x < bx2 &&
    ax2 > b.x &&
    (ay2 === b.y || by2 === a.y)

  return vertical
}

/**
 * Find adjacency-connected islands of rects.
 */
function findIslands(rects: SelectionRect[]): SelectionRect[][] {
  const visited = new Set<number>()
  const islands: SelectionRect[][] = []

  for (let i = 0; i < rects.length; i++) {
    if (visited.has(i)) continue

    const stack = [i]
    const island: SelectionRect[] = []

    while (stack.length) {
      const idx = stack.pop()!
      if (visited.has(idx)) continue
      visited.add(idx)
      island.push(rects[idx])

      for (let j = 0; j < rects.length; j++) {
        if (!visited.has(j) && areAdjacent(rects[idx], rects[j])) {
          stack.push(j)
        }
      }
    }

    islands.push(island)
  }

  return islands
}

function mergeIslandWithMask(rects: SelectionRect[]): SelectionRect {
  // Compute merged bounds
  const bounds = getRectsBounds(rects)

  // Allocate merged mask (if any rect has a mask)
  const hasMask = rects.some(r => r.mask)
  const mergedMask = hasMask
    ? new Uint8Array(bounds.w * bounds.h)
    : null

  if (mergedMask) {
    // Fill with 0 initially
    mergedMask.fill(0)

    // Copy each rect's mask into merged mask
    for (const r of rects) {
      if (!r.mask) continue

      const offsetX = r.x - bounds.x
      const offsetY = r.y - bounds.y

      for (let y = 0; y < r.h; y++) {
        for (let x = 0; x < r.w; x++) {
          const srcIndex = y * r.w + x
          const dstIndex = (offsetY + y) * bounds.w + (offsetX + x)

          mergedMask[dstIndex] = r.mask[srcIndex]
        }
      }
    }
  }

  return {
    x: bounds.x,
    y: bounds.y,
    w: bounds.w,
    h: bounds.h,
    mask: mergedMask,
  }
}

export function mergeAdjacentSelectionRects(rects: SelectionRect[]): SelectionRect[] {
  if (rects.length === 0) return []

  // 1. Find adjacency-connected islands
  const islands = findIslands(rects)

  // 2. Merge each island into a single SelectionRect
  return islands.map(island => mergeIslandWithMask(island))
}
