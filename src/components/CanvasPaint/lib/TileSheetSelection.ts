import type { RectBounds } from '../../../lib/util/data/Bounds.ts'
import { getRectsBounds } from '../../../lib/util/data/Rect.ts'
import { writeImageData } from '../../../lib/util/html-dom/ImageData.ts'
import type { TileId } from '../../../lib/wang-tiles/WangTileset.ts'
import type { TileSheet } from '../data/TileSheet.ts'

export type TileSheetRect = {
  x: number,
  y: number,
  readonly w: number,
  readonly h: number,
  readonly tileId: TileId,

  // combines the TileSheetRects to form the selection in the shape displayed to the user
  // the coords are not in a specific space it just describes how the rects fit together to make a bigger rect
  readonly srcX: number,
  readonly srcY: number,

  // tile grid space pixel coords
  readonly gridX: number | null,
  readonly gridY: number | null,
}

export type TileSheetSelection = {
  // absolute tileSheet rects at extraction time
  readonly originalRects: TileSheetRect[],
  // absolute tileSheet rects after movement
  readonly currentRects: TileSheetRect[],
  // drag offset from original position
  readonly offsetX: number,
  readonly offsetY: number,

  readonly hasMoved: boolean,

  // tileSheet-space, fixed
  // bounding box of originalRects for the buffer
  readonly tileSheetBounds: RectBounds,

  // WHERE it’s being dragged/placed (grid space)
  readonly gridBounds: RectBounds | null,
  readonly initialGridBounds: RectBounds | null,

  move(dx: number, dy: number): void,
  toPixels(tileSheet: TileSheet): ImageData,
}

export function makeTileSheetSelection(rects: TileSheetRect[], tileSheetBounds: RectBounds, gridBounds: RectBounds | null): TileSheetSelection {
  // Deep copies
  const originalRects = rects.map(r => ({ ...r }))
  const currentRects = rects.map(r => ({ ...r }))

  let offsetX = 0
  let offsetY = 0

  let initialGridBounds: null | RectBounds = null
  if (gridBounds) {
    initialGridBounds = { ...gridBounds }
  }

  return {
    originalRects,
    currentRects,
    tileSheetBounds,

    initialGridBounds,
    gridBounds,

    get offsetX() {
      return offsetX
    },
    get offsetY() {
      return offsetY
    },

    get hasMoved() {
      return offsetX !== 0 || offsetY !== 0
    },

    move(dx: number, dy: number) {
      offsetX += dx
      offsetY += dy

      for (let i = 0; i < currentRects.length; i++) {
        currentRects[i].x = originalRects[i].x + offsetX
        currentRects[i].y = originalRects[i].y + offsetY
      }
    },
    toPixels(tileSheet: TileSheet): ImageData {
      const out = new ImageData(tileSheetBounds.w, tileSheetBounds.h)

      for (const r of currentRects) {
        // Convert tile sheet-space rect → tile-local rect
        const src = tileSheet.extractImageData(
          r.x,
          r.y,
          r.w,
          r.h,
        )

        // Destination inside composed buffer
        const dstX = r.x - tileSheetBounds.x
        const dstY = r.y - tileSheetBounds.y

        writeImageData(out, src, dstX, dstY)
        // console.log({
        //   LOG_NAME: 'PIXELS',
        //   rect: r,
        //   localX: r.x - bounds.x,
        //   localY: r.y - bounds.y,
        //   tileId: r.tileId,
        //   bounds,
        // })
      }

      return out
    },
  }
}

/**
 * Two rects are adjacent if they touch exactly along an edge.
 * Works for clipped rects that live inside a single tile.
 */
function areAdjacent(a: RectBounds, b: RectBounds): boolean {
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
function findIslands(rects: RectBounds[]): RectBounds[][] {
  const visited = new Set<number>()
  const islands: RectBounds[][] = []

  for (let i = 0; i < rects.length; i++) {
    if (visited.has(i)) continue

    const stack = [i]
    const island: RectBounds[] = []

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
export function mergeRectBounds(rects: RectBounds[]): RectBounds[] {
  if (rects.length === 0) return []
  const islands = findIslands(rects)
  return islands.map(getRectsBounds)
}
