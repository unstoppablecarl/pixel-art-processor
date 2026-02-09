import type { Rect } from '../../../../lib/util/data/Rect.ts'
import { getRectsBounds } from '../../../../lib/util/data/Rect.ts'
import type { TileId } from '../../../../lib/wang-tiles/WangTileset.ts'
import type { TileGridGeometry } from '../data/TileGridGeometry.ts'
import type { DrawRect, ISelection, SelectionRect, TileAlignedRect } from './ISelection.ts'

export class TileOriginSelection implements ISelection {
  private originalRects: TileAlignedRect[]
  private currentRects: TileAlignedRect[]
  private originalRectsBounds: Rect
  private moved = false

  pixels: ImageData

  constructor(
    rects: SelectionRect[],
    pixels: ImageData,
    private tileId: TileId,
    private geometry: TileGridGeometry,
  ) {
    this.originalRectsBounds = getRectsBounds(rects)

    this.originalRects = rects.map(r =>
      this.selectionRectToTileAlignedRect(r, tileId,
        this.originalRectsBounds.x,
        this.originalRectsBounds.y,
      ),
    )

    this.currentRects = this.originalRects.map(r => ({ ...r }))
    this.pixels = pixels
  }

  hasMoved() {
    return this.moved
  }

  // conversion

  private selectionRectToTileAlignedRect(
    rect: SelectionRect,
    tileId: TileId,
    originX: number,
    originY: number,
  ): TileAlignedRect {
    const { x: tsx, y: tsy } = this.geometry.tileSheet.getTileRect(tileId)

    return {
      tileId,

      // sheet space
      sx: tsx + rect.x,
      sy: tsy + rect.y,

      // selection space
      selectionX: rect.x,
      selectionY: rect.y,

      // all spaces
      w: rect.w,
      h: rect.h,

      // pixel buffer space
      bufferX: rect.x - originX,
      bufferY: rect.y - originY,
      mask: rect.mask,
    }
  }

  // bounds

  private sheetBounds(rects: TileAlignedRect[]): Rect {
    return getRectsBounds(
      rects.map(r => ({
        x: r.sx,
        y: r.sy,
        w: r.w,
        h: r.h,
      })),
    )
  }

  private tileLocalBounds(rects: TileAlignedRect[]): Rect {
    return getRectsBounds(
      rects.map(r => ({
        x: r.selectionX,
        y: r.selectionY,
        w: r.w,
        h: r.h,
      })),
    )
  }

  private gridBounds(rects: SelectionRect[]): Rect {
    return getRectsBounds(rects)
  }

  // sheet bounds

  getOriginalSheetBounds(): Rect {
    return this.sheetBounds(this.originalRects)
  }

  getCurrentSheetBounds(): Rect {
    return this.sheetBounds(this.currentRects)
  }

  // tile bounds (tile-local selection space)

  getOriginalTileBounds(): Rect {
    return this.tileLocalBounds(this.originalRects)
  }

  getCurrentTileBounds(): Rect {
    return this.tileLocalBounds(this.currentRects)
  }

  // tile-aligned rects

  getOriginalTileAlignedRects(): TileAlignedRect[] {
    return this.originalRects
  }

  getCurrentTileAlignedRects(): TileAlignedRect[] {
    return this.currentRects
  }

  // tile rects (selection-space)

  private tileRects(rects: TileAlignedRect[], tileId: TileId): SelectionRect[] {
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
    return this.tileRects(this.originalRects, tileId)
  }

  getCurrentTileRects(tileId: TileId): SelectionRect[] {
    return this.tileRects(this.currentRects, tileId)
  }

  // tile draw rects (tile-local)

  private tileDrawRects(rects: TileAlignedRect[], tileId: TileId): DrawRect[] {
    return rects
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
    return this.tileDrawRects(this.originalRects, tileId)
  }

  getCurrentTileDrawRects(tileId: TileId): DrawRect[] {
    return this.tileDrawRects(this.currentRects, tileId)
  }

  // sheet draw rects

  private sheetDrawRects(rects: TileAlignedRect[]): DrawRect[] {
    return rects.map(r => ({
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
    return this.sheetDrawRects(this.originalRects)
  }

  getCurrentSheetDrawRects(): DrawRect[] {
    return this.sheetDrawRects(this.currentRects)
  }

  // grid rects

  private gridRects(rects: TileAlignedRect[]): SelectionRect[] {
    return rects.flatMap(r => this.geometry.tileAlignedRectToGridRects(r))
  }

  getOriginalGridRects(): SelectionRect[] {
    return this.gridRects(this.originalRects)
  }

  getCurrentGridRects(): SelectionRect[] {
    return this.gridRects(this.currentRects)
  }

  // grid bounds

  getOriginalGridBounds(): Rect {
    return this.gridBounds(this.getOriginalGridRects())
  }

  getCurrentGridBounds(): Rect {
    return this.gridBounds(this.getCurrentGridRects())
  }

  // grid draw rects (correct buffer offsets)

  private gridDrawRects(rects: TileAlignedRect[]): DrawRect[] {
    return rects.map(r => ({
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

  getOriginalGridDrawRects(): DrawRect[] {
    return this.gridDrawRects(this.originalRects)
  }

  getCurrentGridDrawRects(): DrawRect[] {
    return this.gridDrawRects(this.currentRects)
  }

  // movement

  moveOnGrid(_dx: number, _dy: number) {
    throw new Error('tile-origin selection must be promoted before grid movement')
  }

  moveOnTile(dx: number, dy: number, tileId: TileId) {
    if (dx === 0 && dy === 0) return

    this.moved = true

    this.currentRects = this.currentRects.map(r => {
      if (r.tileId !== tileId) return r
      return {
        ...r,
        selectionX: r.selectionX + dx,
        selectionY: r.selectionY + dy,
        sx: r.sx + dx,
        sy: r.sy + dy,
      }
    })
  }

  getOverlappingTileIds(): TileId[] {
    return [this.tileId]
  }
}
