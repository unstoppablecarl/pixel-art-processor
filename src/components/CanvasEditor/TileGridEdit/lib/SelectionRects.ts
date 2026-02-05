import { getRectsBounds, type Rect } from '../../../../lib/util/data/Rect.ts'

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
function findIslands(rects: Rect[]): Rect[][] {
  const visited = new Set<number>()
  const islands: Rect[][] = []

  for (let i = 0; i < rects.length; i++) {
    if (visited.has(i)) continue

    const stack = [i]
    const island: Rect[] = []

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

/**
 * Merge rects into adjacency-connected islands.
 * Returns one merged rect per island.
 */
export function mergeAdjacentRects(rects: Rect[]): Rect[] {
  if (rects.length === 0) return []
  const islands = findIslands(rects)
  return islands.map(getRectsBounds)
}