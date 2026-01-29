import type { RectBounds } from '../../../lib/util/data/Bounds.ts'
import { getRectsBounds } from '../../../lib/util/data/Rect.ts'
import type { TileId } from '../../../lib/wang-tiles/WangTileset.ts'
import { CanvasType } from '../_canvas-editor-types.ts'

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

export type SelectionTileSheetRect = BaseTileSheetRect & {

  // tile grid space pixel coords
  readonly gridX: number | null,
  readonly gridY: number | null,

  // buffer space coord
  bufferX: number,
  bufferY: number,
}

export type NormalizedTileSheetRect = SelectionTileSheetRect & {
  srcX: number
  srcY: number
}

export type TileSheetSelection = {
  pixels: ImageData,
  // absolute tileSheet rects at extraction time
  readonly originalRects: SelectionTileSheetRect[],
  // absolute tileSheet rects after movement
  currentRects: SelectionTileSheetRect[],

  // tileSheet-space, fixed
  // bounding box of originalRects for the buffer
  readonly tileSheetBounds: RectBounds,

  // current moved selection bounds in tile grid pixel space
  // only has a value when this selection was created in the tile grid
  gridBounds: RectBounds | null,
  // initial selection bounds
  readonly initialGridBounds: RectBounds | null,

  // type of canvas this selection was created in
  // or currently is within (selecting in single tile then moving in grid changes origin)
  origin: CanvasType,

  // grid‑pixel position of the selection at the start of a *move* drag
  // in a grid canvas
  dragMoveStartGridX: number | null,
  dragMoveStartGridY: number | null,

  // tile‑pixel position of the selection at the start of a *move* drag
  // in a single tile canvas
  dragMoveStartTileLocalX: number | null,
  dragMoveStartTileLocalY: number | null,

  // used if selected in a single tile canvas
  initialTileId: TileId | null
  initialTileLocalBounds: RectBounds | null

  getOverlappingTileIds(): TileId[],

  // if this selection has been dragged changing its position
  get hasMoved(): boolean,
}
type InternalGridOptions = {
  pixels: ImageData,
  rects: SelectionTileSheetRect[],
  tileSheetBounds: RectBounds,
  origin: CanvasType.GRID,
  gridBounds: RectBounds,
}

type InternalTileOptions = {
  pixels: ImageData,
  rects: SelectionTileSheetRect[],
  tileSheetBounds: RectBounds,
  origin: CanvasType.TILE,
  tileId: TileId,
  tileLocalBounds: RectBounds,
}

export function makeGridSelection(
  pixels: ImageData,
  rects: NormalizedTileSheetRect[],
  tileSheetBounds: RectBounds,
  gridBounds: RectBounds,
): TileSheetSelection {
  return _makeSelection({
    pixels,
    rects,
    tileSheetBounds,
    origin: CanvasType.GRID,
    gridBounds,
  })
}

export function makeTileSelection(
  pixels: ImageData,
  rects: SelectionTileSheetRect[],
  tileSheetBounds: RectBounds,
  tileId: TileId,
  tileLocalBounds: RectBounds,
): TileSheetSelection {
  return _makeSelection({
    pixels,
    rects,
    tileSheetBounds,
    origin: CanvasType.TILE,
    tileId,
    tileLocalBounds,
  })
}

function _makeSelection(
  opts: InternalGridOptions | InternalTileOptions,
) {

  const { pixels, rects, tileSheetBounds, origin } = opts

  const originalRects = rects.map(r => ({ ...r }))
  const currentRects = rects.map(r => ({ ...r }))


  const initialGridBounds =
    origin === CanvasType.GRID
      ? { ...opts.gridBounds }
      : null

  const gridBounds =
    origin === CanvasType.GRID
      ? { ...opts.gridBounds }
      : null

  const initialTileId =
    origin === CanvasType.TILE
      ? opts.tileId
      : null

  const initialTileLocalBounds =
    origin === CanvasType.TILE
      ? { ...opts.tileLocalBounds }
      : null

  return {
    pixels,
    originalRects,
    currentRects,

    tileSheetBounds,

    initialGridBounds,
    gridBounds,

    origin,

    dragMoveStartGridX: null,
    dragMoveStartGridY: null,

    dragMoveStartTileLocalX: null,
    dragMoveStartTileLocalY: null,

    initialTileId,
    initialTileLocalBounds,

    get hasMoved() {
      if (this.origin === CanvasType.GRID) {
        if (!this.initialGridBounds || !this.gridBounds) return false
        return (
          this.gridBounds.x !== this.initialGridBounds.x ||
          this.gridBounds.y !== this.initialGridBounds.y
        )
      }

      // TILE-origin: compare rect translations
      for (let i = 0; i < this.originalRects.length; i++) {
        const o = this.originalRects[i]
        const c = this.currentRects[i]
        if (o.x !== c.x || o.y !== c.y) return true
      }
      return false
    },

    getOverlappingTileIds() {
      const ids = new Set<TileId>()
      for (const r of originalRects) ids.add(r.tileId)
      for (const r of currentRects) ids.add(r.tileId)
      return [...ids]
    },
  }
}

export function normalizeTileSheetRects(rects: SelectionTileSheetRect[]): {
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
