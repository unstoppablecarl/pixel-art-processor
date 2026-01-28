import type { RectBounds } from '../../../lib/util/data/Bounds.ts'
import { getRectsBounds } from '../../../lib/util/data/Rect.ts'
import type { TileId } from '../../../lib/wang-tiles/WangTileset.ts'

export type NormalizedTileSheetRect = TileSheetRect & {
  srcX: number
  srcY: number
}

export type BaseTileSheetRect = {
  readonly tileId: TileId,
  x: number,
  y: number,
  readonly w: number,
  readonly h: number,

  // tile-local pixels
  readonly tileX: number
  readonly tileY: number
}

export type TileSheetRect = BaseTileSheetRect & {

  // tile grid space pixel coords
  readonly gridX: number | null,
  readonly gridY: number | null,

  // buffer space coord
  bufferX: number,
  bufferY: number,
}

export type TileSheetSelection = {
  pixels: ImageData,
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

  getOverlappingTileIds(): TileId[],
}

export function makeTileSheetSelection(
  pixels: ImageData,
  rects: NormalizedTileSheetRect[] | TileSheetRect[] | BaseTileSheetRect[],
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
    pixels,
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
  return selection
}

export function normalizeTileSheetRects(rects: TileSheetRect[]): {
  normalizedRects: NormalizedTileSheetRect[],
  tileSheetBounds: RectBounds,
} {
  // 1. Compute tileSheet bounding box (tileSheet pixel space)
  const tileSheetBounds = getRectsBounds(rects)

  // 2. Normalize rects so their x/y are relative to tileSheetBounds
  const normalizedRects = rects.map(r => ({
    ...r,
    srcX: r.x - tileSheetBounds.x,
    srcY: r.y - tileSheetBounds.y,
  }))

  return {
    normalizedRects,
    tileSheetBounds,
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
