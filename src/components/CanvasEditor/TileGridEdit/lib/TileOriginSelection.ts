import type { Rect } from '../../../../lib/util/data/Rect.ts'
import type { TileId } from '../../../../lib/wang-tiles/WangTileset.ts'
import type { TileGridGeometry } from '../data/TileGridGeometry.ts'
import type { DrawRect, GridSelectionRect, ISelection, SheetAlignedRect, TileAlignedRect } from './ISelection.ts'

export class TileOriginSelection implements ISelection {
  private originalRects: TileAlignedRect[]
  private currentRects: TileAlignedRect[]
  private dragStartRects: TileAlignedRect[] | null = null
  private moved = false

  pixels: ImageData
  tileSheetBounds: Rect

  constructor(
    rects: TileAlignedRect[],
    private geometry: TileGridGeometry,
    pixels: ImageData,
    tileSheetBounds: Rect,
  ) {
    this.originalRects = rects
    this.currentRects = rects.map(r => ({ ...r }))
    this.pixels = pixels
    this.tileSheetBounds = tileSheetBounds
  }

  hasMoved() {
    return this.moved
  }

  // --- FOOTPRINTS (grid-space) ---
  getOriginalGridFootprint(): GridSelectionRect[] {
    return this.originalRects.flatMap(r =>
      this.geometry.tileAlignedRectToGridRects(r),
    )
  }

  getCurrentGridFootprint(): GridSelectionRect[] {
    return this.currentRects.flatMap(r =>
      this.geometry.tileAlignedRectToGridRects(r),
    )
  }

  // --- TILE-ALIGNED GEOMETRY ---
  getOriginalTileAlignedRects() {
    return this.originalRects
  }

  getCurrentTileAlignedRects() {
    return this.currentRects
  }

  // --- MOVEMENT (tile-space only) ---
  moveOnGrid() {
    throw new Error("Tile-origin selection must be promoted before grid movement")
  }

  moveOnTile(dx: number, dy: number, tileId: TileId) {
    if (!this.dragStartRects) return
    if (dx === 0 && dy === 0) return

    this.moved = true

    this.currentRects = this.dragStartRects.map(r => {
      if (r.tileId !== tileId) return r
      return {
        ...r,
        selectionX: r.selectionX + dx,
        selectionY: r.selectionY + dy,
      }
    })
  }

  startGridDrag() {
    throw new Error("Tile-origin selection cannot start grid drag until promoted")
  }

  startTileDrag() {
    this.dragStartRects = this.currentRects.map(r => ({ ...r }))
  }

  // --- SHEET PROJECTION ---
  private projectToSheet(rects: TileAlignedRect[]): SheetAlignedRect[] {
    return rects.map(r => this.geometry.tileAlignedRectToSheetRect(r))
  }

  getOriginalDrawRectsForSheet(): DrawRect[] {
    return this.projectToSheet(this.originalRects).map(r => ({
      dx: r.x,
      dy: r.y,
      sx: r.bufferX,
      sy: r.bufferY,
      w: r.w,
      h: r.h,
      mask: r.mask ?? undefined,
    }))
  }

  getCurrentDrawRectsForSheet(): DrawRect[] {
    return this.projectToSheet(this.currentRects).map(r => ({
      dx: r.x,
      dy: r.y,
      sx: r.bufferX,
      sy: r.bufferY,
      w: r.w,
      h: r.h,
      mask: r.mask ?? undefined,
    }))
  }

  // --- GRID PROJECTION ---
  getOriginalDrawRectsForGrid(): DrawRect[] {
    return this.getOriginalGridFootprint().map(g => ({
      dx: g.x,
      dy: g.y,
      sx: 0,
      sy: 0,
      w: g.w,
      h: g.h,
      mask: g.mask ?? undefined,
    }))
  }

  getCurrentDrawRectsForGrid(): DrawRect[] {
    return this.getCurrentGridFootprint().map(g => ({
      dx: g.x,
      dy: g.y,
      sx: 0,
      sy: 0,
      w: g.w,
      h: g.h,
      mask: g.mask ?? undefined,
    }))
  }

  getOverlappingTileIds(): TileId[] {
    return this.currentRects.map(r => r.tileId)
  }
}
