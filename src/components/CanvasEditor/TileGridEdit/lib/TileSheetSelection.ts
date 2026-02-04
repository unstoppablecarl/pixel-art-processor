import type { Point } from '../../../../lib/node-data-types/BaseDataStructure.ts'
import { getRectsBounds, type Rect } from '../../../../lib/util/data/Rect.ts'
import type { TileId } from '../../../../lib/wang-tiles/WangTileset.ts'
import { CanvasType } from '../_tile-grid-editor-types.ts'

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

  mask: Uint8Array | null,
}

export type NormalizedTileSheetRect = SelectionTileSheetRect & {
  srcX: number
  srcY: number
}

export type TileSheetSelection = {
  pixels: ImageData,

  // tileSheet-space rects at extraction time
  // These define the exact pixels copied into `pixels`.
  readonly originalRects: SelectionTileSheetRect[],

  readonly floodFillOrigin: Point | null,

  // tilesheet-space rects after movement.
  // These are the authoritative positions used for overlay + commit.
  currentRects: SelectionTileSheetRect[],

  // Tilesheet‑space bounding box of `originalRects`.
  // Defines the coordinate space of the selection buffer `pixels`.
  readonly tileSheetBounds: Rect,

  // Current moved selection bounds in GRID‑PIXEL space.
  // Only populated for GRID‑origin selections.
  gridBounds: Rect | null,

  // Initial grid‑pixel bounds at creation time (GRID‑origin only).
  readonly initialGridBounds: Rect | null,

  // Which canvas the selection was created in (TILE or GRID).
  // This determines which drag anchor model is used.
  origin: CanvasType,

  // GRID‑pixel mouse position at the start of a drag on the GRID canvas.
  // Used only when dragging a GRID‑origin selection on the grid.
  dragMoveStartGridX: number | null,
  dragMoveStartGridY: number | null,

  // TILE‑local mouse position at the start of a drag on the TILE canvas.
  // Used only when dragging a GRID‑origin selection on the tile canvas.
  dragMoveStartTileLocalX: number | null,
  dragMoveStartTileLocalY: number | null,

  // Tilesheet‑space mouse position at the start of a drag.
  // Used for TILE‑origin selections (on either canvas),
  // and also for GRID‑origin selections dragged on the grid canvas.
  dragMoveStartSheetX: number | null,
  dragMoveStartSheetY: number | null,

  // Snapshot of `currentRects` at drag start (tilesheet‑space).
  // Used with dragMoveStartSheetX/Y to compute sheet‑space deltas.
  dragStartSheetRects: SelectionTileSheetRect[] | null,

  // The tile the selection was originally taken from (TILE‑origin only).
  initialTileId: TileId | null
  // TILE‑local bounds of the selection at creation time (TILE‑origin only).
  initialTileLocalBounds: Rect | null

  // All tileIds touched by original or current rects.
  getOverlappingTileIds(): TileId[],

  // if this selection has been dragged changing its position
  get hasMoved(): boolean,
}

type InternalGridOptions = {
  pixels: ImageData,
  rects: SelectionTileSheetRect[],
  tileSheetBounds: Rect,
  origin: CanvasType.GRID,
  gridBounds: Rect,
  floodFillOrigin: Point | null,
}

type InternalTileOptions = {
  pixels: ImageData,
  rects: SelectionTileSheetRect[],
  tileSheetBounds: Rect,
  origin: CanvasType.TILE,
  tileId: TileId,
  tileLocalBounds: Rect,
  floodFillOrigin: Point | null,
}

export function makeGridSelection(
  pixels: ImageData,
  rects: NormalizedTileSheetRect[],
  tileSheetBounds: Rect,
  gridBounds: Rect,
  floodFillOrigin: Point | null = null,
): TileSheetSelection {
  return _makeSelection({
    pixels,
    rects,
    tileSheetBounds,
    origin: CanvasType.GRID,
    gridBounds,
    floodFillOrigin,
  })
}

export function makeTileSelection(
  pixels: ImageData,
  rects: SelectionTileSheetRect[] | NormalizedTileSheetRect[],
  tileSheetBounds: Rect,
  tileId: TileId,
  tileLocalBounds: Rect,
  floodFillOrigin: Point | null = null,
): TileSheetSelection {
  return _makeSelection({
    pixels,
    rects,
    tileSheetBounds,
    origin: CanvasType.TILE,
    tileId,
    tileLocalBounds,
    floodFillOrigin,
  })
}

function _makeSelection(
  opts: InternalGridOptions | InternalTileOptions,
) {

  const { pixels, rects, tileSheetBounds, origin, floodFillOrigin } = opts

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

    floodFillOrigin,
    dragMoveStartGridX: null,
    dragMoveStartGridY: null,

    dragMoveStartTileLocalX: null,
    dragMoveStartTileLocalY: null,

    dragMoveStartSheetX: null,
    dragMoveStartSheetY: null,

    dragStartSheetRects: null,

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
  tileSheetBounds: Rect,
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
