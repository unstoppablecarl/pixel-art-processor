import { getRectsBounds, type Rect } from '../../../../lib/util/data/Rect.ts'
import type { TileId } from '../../../../lib/wang-tiles/WangTileset.ts'
import { sliceMask } from '../data/TileGridGeometry.ts'

export type SelectionRect = {
  x: number
  y: number
  w: number
  h: number
  mask: Uint8Array | null
}

export type TileAlignedRect = {
  tileId: TileId

  // sheet space
  sx: number,
  sy: number,

  // selection space
  selectionX: number
  selectionY: number

  // all spaces
  w: number
  h: number

  // pixel space
  bufferX: number
  bufferY: number
  mask: Uint8Array | null
}

export interface DrawRect {
  tileId: TileId,
  dx: number  // destination x (grid or sheet)
  dy: number  // destination y
  sx: number  // source x inside pixel buffer
  sy: number  // source y inside pixel buffer
  w: number
  h: number

  mask?: Uint8Array | null
}

export interface ISelection {
  getOriginalSheetBounds(): Rect
  getCurrentSheetBounds(): Rect

  getOriginalTileAlignedRects(): TileAlignedRect[]
  getCurrentTileAlignedRects(): TileAlignedRect[]

  getOriginalSheetDrawRects(): DrawRect[]
  getCurrentSheetDrawRects(): DrawRect[]

  getOriginalTileBounds(): Rect
  getCurrentTileBounds(): Rect

  getOriginalTileRects(tileId: TileId): SelectionRect[]
  getCurrentTileRects(tileId: TileId): SelectionRect[]

  getOriginalTileDrawRects(tileId: TileId): DrawRect[]
  getCurrentTileDrawRects(tileId: TileId): DrawRect[]

  getOriginalGridBounds(): Rect
  getCurrentGridBounds(): Rect

  getOriginalGridRects(): SelectionRect[]
  getCurrentGridRects(): SelectionRect[]

  getOriginalGridDrawRects(): DrawRect[]
  getCurrentGridDrawRects(): DrawRect[]

  moveOnGrid(dx: number, dy: number): void
  moveOnTile(dx: number, dy: number, tileId: TileId): void

  hasMoved(): boolean
  pixels: ImageData

  getOverlappingTileIds(): TileId[]
}

export function mergeSelectionRects(current: SelectionRect[], adding: SelectionRect[]): SelectionRect[] {
  const rects = [...current, ...adding]

  let changed = true
  while (changed) {
    changed = false
    const next: SelectionRect[] = []

    for (const r of rects) {
      let merged = false

      for (let i = 0; i < next.length; i++) {
        const n = next[i]

        const overlap =
          r.x <= n.x + n.w &&
          r.x + r.w >= n.x &&
          r.y <= n.y + n.h &&
          r.y + r.h >= n.y

        if (overlap) {
          next[i] = mergeTwoRects(n, r)
          merged = true
          changed = true
          break
        }
      }

      if (!merged) next.push(r)
    }

    rects.splice(0, rects.length, ...next)
  }

  return rects
}
export function subtractSelectionRects(current: SelectionRect[], subtracting: SelectionRect[]): SelectionRect[] {
  let result = [...current]

  for (const sub of subtracting) {
    const next: SelectionRect[] = []

    for (const r of result) {
      const ix = Math.max(r.x, sub.x)
      const iy = Math.max(r.y, sub.y)
      const ix2 = Math.min(r.x + r.w, sub.x + sub.w)
      const iy2 = Math.min(r.y + r.h, sub.y + sub.h)

      const intersects = ix < ix2 && iy < iy2

      if (!intersects) {
        next.push(r)
        continue
      }

      const baseMask = r.mask ?? new Uint8Array(r.w * r.h).fill(1)
      const newMask = new Uint8Array(baseMask)

      for (let yy = iy; yy < iy2; yy++) {
        for (let xx = ix; xx < ix2; xx++) {
          const rx = xx - r.x
          const ry = yy - r.y
          newMask[ry * r.w + rx] = 0
        }
      }

      const pieces: SelectionRect[] = []

      if (r.y < iy) {
        pieces.push({
          x: r.x,
          y: r.y,
          w: r.w,
          h: iy - r.y,
          mask: sliceMaskRegion(newMask, r, r.x, r.y, r.w, iy - r.y)
        })
      }

      if (iy2 < r.y + r.h) {
        pieces.push({
          x: r.x,
          y: iy2,
          w: r.w,
          h: r.y + r.h - iy2,
          mask: sliceMaskRegion(newMask, r, r.x, iy2, r.w, r.y + r.h - iy2)
        })
      }

      if (r.x < ix) {
        pieces.push({
          x: r.x,
          y: iy,
          w: ix - r.x,
          h: iy2 - iy,
          mask: sliceMaskRegion(newMask, r, r.x, iy, ix - r.x, iy2 - iy)
        })
      }

      if (ix2 < r.x + r.w) {
        pieces.push({
          x: ix2,
          y: iy,
          w: r.x + r.w - ix2,
          h: iy2 - iy,
          mask: sliceMaskRegion(newMask, r, ix2, iy, r.x + r.w - ix2, iy2 - iy)
        })
      }

      next.push(...pieces)
    }

    result = next
  }

  return result
}

function mergeTwoRects(a: SelectionRect, b: SelectionRect): SelectionRect {
  const bounds = getRectsBounds([a, b])

  // both fully selected
  if (a.mask === null && b.mask === null) {
    return { ...bounds, mask: null }
  }

  // allocate merged mask
  const mask = new Uint8Array(bounds.w * bounds.h)

  for (let yy = 0; yy < bounds.h; yy++) {
    for (let xx = 0; xx < bounds.w; xx++) {
      const gx = bounds.x + xx
      const gy = bounds.y + yy

      const insideA =
        gx >= a.x && gx < a.x + a.w &&
        gy >= a.y && gy < a.y + a.h

      const insideB =
        gx >= b.x && gx < b.x + b.w &&
        gy >= b.y && gy < b.y + b.h

      const aVal =
        a.mask === null
          ? (insideA ? 1 : 0)
          : (insideA ? a.mask[(gy - a.y) * a.w + (gx - a.x)] : 0)

      const bVal =
        b.mask === null
          ? (insideB ? 1 : 0)
          : (insideB ? b.mask[(gy - b.y) * b.w + (gx - b.x)] : 0)

      mask[yy * bounds.w + xx] = aVal | bVal
    }
  }

  return { ...bounds, mask }
}

function sliceMaskRegion(
  mask: Uint8Array,
  r: SelectionRect,
  x: number,
  y: number,
  w: number,
  h: number
): Uint8Array | null {
  return sliceMask(
    mask,
    x - r.x,
    y - r.y,
    w,
    h,
    r.w
  )
}
