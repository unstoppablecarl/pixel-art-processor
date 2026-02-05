import { getRectsBounds, type Rect } from '../../../../lib/util/data/Rect.ts'
import type { TileId } from '../../../../lib/wang-tiles/WangTileset.ts'
import type { TileGridGeometry } from '../data/TileGridGeometry.ts'
import type { DrawRect, ISelection, SelectionRect, TileAlignedRect } from './ISelection.ts'

export class GridOriginSelection implements ISelection {
  private originalRects: SelectionRect[]
  private currentRects: SelectionRect[]
  private moved = false

  private originalRectBounds: Rect
  pixels: ImageData

  constructor(
    rects: SelectionRect[],
    pixels: ImageData,
    private geometry: TileGridGeometry,
  ) {
    this.originalRects = rects
    this.currentRects = rects.map(r => ({ ...r }))
    this.originalRectBounds = getRectsBounds(rects)
    this.pixels = pixels
  }

  private get currentRectBounds(): Rect {
    return getRectsBounds(this.currentRects)
  }

  hasMoved() {
    return this.moved
  }

  getOriginalGridBounds(): Rect {
    return this.originalRectBounds
  }

  getCurrentGridBounds(): Rect {
    return this.currentRectBounds
  }

  getOriginalGridRects(): SelectionRect[] {
    return this.originalRects
  }

  getCurrentGridRects(): SelectionRect[] {
    return this.currentRects
  }

  private tileAlignedFrom(
    rects: SelectionRect[],
    originX: number,
    originY: number,
  ): TileAlignedRect[] {
    return this.geometry.gridRectsToTileAlignedRects(rects, originX, originY)
  }

  getOriginalTileAlignedRects(): TileAlignedRect[] {
    return this.tileAlignedFrom(
      this.originalRects,
      this.originalRectBounds.x,
      this.originalRectBounds.y,
    )
  }

  getCurrentTileAlignedRects(): TileAlignedRect[] {
    const b = this.currentRectBounds
    return this.tileAlignedFrom(this.currentRects, b.x, b.y)
  }

  private sheetBoundsFrom(tileRects: TileAlignedRect[]): Rect {
    return getRectsBounds(
      tileRects.map(r => ({
        x: r.sx,
        y: r.sy,
        w: r.w,
        h: r.h,
      })),
    )
  }

  getOriginalSheetBounds(): Rect {
    return this.sheetBoundsFrom(this.getOriginalTileAlignedRects())
  }

  getCurrentSheetBounds(): Rect {
    return this.sheetBoundsFrom(this.getCurrentTileAlignedRects())
  }

  private sheetDrawRectsFor(rects: SelectionRect[], originX: number, originY: number): DrawRect[] {
    return this.tileAlignedFrom(rects, originX, originY).map(r => ({
      dx: r.sx,
      dy: r.sy,
      sx: r.bufferX,
      sy: r.bufferY,
      w: r.w,
      h: r.h,
      mask: r.mask ?? undefined,
      tileId: r.tileId,
    }))
  }

  getOriginalSheetDrawRects(): DrawRect[] {
    return this.sheetDrawRectsFor(
      this.originalRects,
      this.originalRectBounds.x,
      this.originalRectBounds.y,
    )
  }

  getCurrentSheetDrawRects(): DrawRect[] {
    const b = this.currentRectBounds
    return this.sheetDrawRectsFor(this.currentRects, b.x, b.y)
  }

  private gridDrawRectsFor(rects: SelectionRect[], originX: number, originY: number): DrawRect[] {
    return this.tileAlignedFrom(rects, originX, originY).map(r => ({
      dx: originX + r.selectionX,
      dy: originY + r.selectionY,
      sx: r.bufferX,
      sy: r.bufferY,
      w: r.w,
      h: r.h,
      mask: r.mask ?? undefined,
      tileId: r.tileId,
    }))
  }

  getOriginalGridDrawRects(): DrawRect[] {
    return this.gridDrawRectsFor(
      this.originalRects,
      this.originalRectBounds.x,
      this.originalRectBounds.y,
    )
  }

  getCurrentGridDrawRects(): DrawRect[] {
    const b = this.currentRectBounds
    return this.gridDrawRectsFor(this.currentRects, b.x, b.y)
  }

  private tileRectsFor(rects: TileAlignedRect[], tileId: TileId): SelectionRect[] {
    return rects
      .filter(r => r.tileId === tileId)
      .map(r => ({
        x: r.selectionX,
        y: r.selectionY,
        w: r.w,
        h: r.h,
        mask: r.mask,
      }))
  }

  getOriginalTileRects(tileId: TileId): SelectionRect[] {
    return this.tileRectsFor(this.getOriginalTileAlignedRects(), tileId)
  }

  getCurrentTileRects(tileId: TileId): SelectionRect[] {
    return this.tileRectsFor(this.getCurrentTileAlignedRects(), tileId)
  }

  private tileBoundsFrom(tileRects: TileAlignedRect[]): Rect {
    return getRectsBounds(
      tileRects.map(r => ({
        x: r.selectionX,
        y: r.selectionY,
        w: r.w,
        h: r.h,
      })),
    )
  }

  getOriginalTileBounds(): Rect {
    return this.tileBoundsFrom(this.getOriginalTileAlignedRects())
  }

  getCurrentTileBounds(): Rect {
    return this.tileBoundsFrom(this.getCurrentTileAlignedRects())
  }

  private tileDrawRectsFrom(tileRects: TileAlignedRect[], tileId: TileId): DrawRect[] {
    return tileRects
      .filter(r => r.tileId === tileId)
      .map(r => ({
        dx: r.selectionX,
        dy: r.selectionY,
        sx: r.bufferX,
        sy: r.bufferY,
        w: r.w,
        h: r.h,
        mask: r.mask ?? undefined,
        tileId: r.tileId,
      }))
  }

  getOriginalTileDrawRects(tileId: TileId): DrawRect[] {
    return this.tileDrawRectsFrom(this.getOriginalTileAlignedRects(), tileId)
  }

  getCurrentTileDrawRects(tileId: TileId): DrawRect[] {
    return this.tileDrawRectsFrom(this.getCurrentTileAlignedRects(), tileId)
  }

  moveOnGrid(dx: number, dy: number) {
    if (dx === 0 && dy === 0) return

    this.moved = true

    this.currentRects = this.currentRects.map(r => ({
      ...r,
      x: r.x + dx,
      y: r.y + dy,
    }))
  }

  moveOnTile(dx: number, dy: number) {
    this.moveOnGrid(dx, dy)
  }

  getOverlappingTileIds(): TileId[] {
    return [
      ...this.getOriginalTileAlignedRects().map(r => r.tileId),
      ...this.getCurrentTileAlignedRects().map(r => r.tileId),
    ]
  }
}
