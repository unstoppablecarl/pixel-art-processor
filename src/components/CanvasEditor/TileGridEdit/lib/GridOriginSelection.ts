import type { Rect } from '../../../../lib/util/data/Rect.ts'
import type { TileId } from '../../../../lib/wang-tiles/WangTileset.ts'
import type { TileGridGeometry } from '../data/TileGridGeometry.ts'
import type { DrawRect, GridSelectionRect, ISelection, SheetAlignedRect, TileAlignedRect } from './ISelection.ts'

export class GridOriginSelection implements ISelection {
  private originalRects: GridSelectionRect[]
  private currentRects: GridSelectionRect[]
  private dragStartRects: GridSelectionRect[] | null = null
  private moved = false

  pixels: ImageData
  tileSheetBounds: Rect

  constructor(
    rects: GridSelectionRect[],
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

  // --- FOOTPRINTS ---
  getOriginalGridFootprint() {
    return this.originalRects
  }

  getCurrentGridFootprint() {
    return this.currentRects
  }

  // --- TILE-ALIGNED GEOMETRY ---
  private tileAlignedFrom(rects: GridSelectionRect[]): TileAlignedRect[] {
    return this.geometry.gridRectsToTileAlignedRects(rects)
  }

  getOriginalTileAlignedRects() {
    return this.tileAlignedFrom(this.originalRects)
  }

  getCurrentTileAlignedRects() {
    return this.tileAlignedFrom(this.currentRects)
  }

  // --- MOVEMENT ---
  moveOnGrid(dx: number, dy: number) {
    if (!this.dragStartRects) return
    if (dx === 0 && dy === 0) return

    this.moved = true

    this.currentRects = this.dragStartRects.map(r => ({
      ...r,
      x: r.x + dx,
      y: r.y + dy,
    }))
  }

  moveOnTile(dx: number, dy: number) {
    this.moveOnGrid(dx, dy)
  }

  startGridDrag() {
    this.dragStartRects = this.currentRects.map(r => ({ ...r }))
  }

  startTileDrag(tx: number, ty: number) {
    this.startGridDrag()
  }

  // --- SHEET PROJECTION ---
  private projectToSheet(rects: GridSelectionRect[]): SheetAlignedRect[] {
    return this.tileAlignedFrom(rects).map(r =>
      this.geometry.tileAlignedRectToSheetRect(r),
    )
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
  private getDrawRectsForGrid(rects: GridSelectionRect[]): DrawRect[] {
    return this.tileAlignedFrom(rects).map(r => ({
      dx: r.selectionX + rects[0].x,
      dy: r.selectionY + rects[0].y,
      sx: r.bufferX,
      sy: r.bufferY,
      w: r.w,
      h: r.h,
      mask: r.mask ?? undefined,
    }))
  }

  getOriginalDrawRectsForGrid(): DrawRect[] {
    return this.getDrawRectsForGrid(this.originalRects)
  }

  getCurrentDrawRectsForGrid(): DrawRect[] {
    return this.getDrawRectsForGrid(this.currentRects)
  }

  getOverlappingTileIds(): TileId[] {
    return this.getCurrentTileAlignedRects().map(r => r.tileId)
  }
}
