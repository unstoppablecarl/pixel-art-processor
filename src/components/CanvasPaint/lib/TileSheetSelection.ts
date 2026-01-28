import type { RectBounds } from '../../../lib/util/data/Bounds.ts'
import { getRectsBounds } from '../../../lib/util/data/Rect.ts'
import { writeImageData } from '../../../lib/util/html-dom/ImageData.ts'
import type { TileId } from '../../../lib/wang-tiles/WangTileset.ts'
import type { TileSheet } from '../data/TileSheet.ts'

export type SelectionCommitResult = {
  rects: TileSheetRect[],
  bounds: RectBounds
}

export type TileSheetRect = {
  x: number,
  y: number,
  readonly w: number,
  readonly h: number,
  readonly tileId: TileId,

  // tile-local pixels
  readonly tileX: number
  readonly tileY: number

  // tile grid space pixel coords
  readonly gridX: number | null,
  readonly gridY: number | null,
}

export type TileSheetSelection = {
  // absolute tileSheet rects at extraction time
  readonly originalRects: TileSheetRect[],
  // absolute tileSheet rects after movement
  currentRects: TileSheetRect[],

  // if this selection has been dragged changing its position
  readonly hasMoved: boolean,

  // tileSheet-space, fixed
  // bounding box of originalRects for the buffer
  readonly tileSheetBounds: RectBounds,

  // current moved selection bounds in tile grid pixel space
  // only has a value when this selection was created in the tile grid
  gridBounds: RectBounds | null,
  // initial selection bounds
  initialGridBounds: RectBounds | null,

  // grid‑pixel position of the selection at the start of a *move* drag
  dragMoveStartGridX: number | null,
  dragMoveStartGridY: number | null,

  // drag movement offset from original position
  offsetX: number,
  offsetY: number,

  toPixels(tileSheet: TileSheet): ImageData,
  getOverlappingTileIds(): TileId[],
}

export function makeTileSheetSelection(
  rects: TileSheetRect[],
  tileSheetBounds: RectBounds,
  gridBounds: RectBounds | null = null,
): TileSheetSelection {

  // Deep copies
  const originalRects = rects.map(r => ({ ...r }))
  const currentRects = rects.map(r => ({ ...r }))

  let initialGridBounds: null | RectBounds = null
  if (gridBounds) {
    initialGridBounds = { ...gridBounds }
  }

  const selection: TileSheetSelection = {
    originalRects,
    currentRects,
    tileSheetBounds,

    initialGridBounds,
    gridBounds,

    dragMoveStartGridX: null,
    dragMoveStartGridY: null,

    offsetX: 0,
    offsetY: 0,

    get hasMoved() {
      const movedInGrid =
        this.gridBounds &&
        this.initialGridBounds &&
        (
          this.gridBounds.x !== this.initialGridBounds.x ||
          this.gridBounds.y !== this.initialGridBounds.y
        )

      const movedByOffset = this.offsetX !== 0 || this.offsetY !== 0

      return movedInGrid || movedByOffset
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

      }

      return out
    },

    getOverlappingTileIds() {
      const tileIds = new Set<TileId>()

      for (const r of originalRects) {
        tileIds.add(r.tileId)
      }
      for (const r of currentRects) {
        tileIds.add(r.tileId)
      }
      return [...tileIds]
    },
  }

  // console.log({
  //   LOG_NAME: 'makeTileSheetSelection.output',
  //   originalRects,
  //   currentRects,
  //   tileSheetBounds,
  //   initialGridBounds,
  //   gridBounds,
  // })

  return selection
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
