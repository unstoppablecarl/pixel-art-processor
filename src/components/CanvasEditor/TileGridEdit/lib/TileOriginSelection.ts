import type { Rect } from '../../../../lib/util/data/Rect.ts'
import { getRectsBounds } from '../../../../lib/util/data/Rect.ts'
import type { TileId } from '../../../../lib/wang-tiles/WangTileset.ts'
import type { TileGridGeometry } from '../data/TileGridGeometry.ts'
import type { DrawRect, ISelection, SelectionRect, TileOriginTileAlignedRect } from './ISelection.ts'

export class TileOriginSelection implements ISelection {
  private originalRects: SelectionRect[]
  private currentRects: SelectionRect[]
  private originalRectsBounds: Rect
  private moved = false
  pixels: ImageData

  constructor(rects: SelectionRect[], private tileId: TileId, private geometry: TileGridGeometry) {

    const tileAlignedRects = this.geometry.tileRectsToTileAlignedRects(
      tileId,
      rects,
      0,
      0,
    )

    const sheetBounds = getRectsBounds(
      tileAlignedRects.map(r => ({
        x: r.sx,
        y: r.sy,
        w: r.w,
        h: r.h,
      })),
    )

    const pixels = this.geometry.tileSheet.extractImageData(sheetBounds)

    this.originalRects = tileAlignedRects.map(r => ({
      x: r.tileSelectionX,
      y: r.tileSelectionY,
      w: r.w,
      h: r.h,
      mask: r.mask,
    }))
    this.currentRects = rects.map(r => ({ ...r }))
    this.originalRectsBounds = getRectsBounds(rects)
    this.pixels = pixels
  }

  hasMoved(): boolean {
    return this.moved
  }

  getOriginalGridRects(): SelectionRect[] {
    throw new Error('not implemented')
  }

  getCurrentGridRects(): SelectionRect[] {
    throw new Error('not implemented')
  }

  // --- Tile Aligned Rects ---
  private tileAlignedFrom(rects: SelectionRect[], originX: number, originY: number): TileOriginTileAlignedRect[] {
    const { x: tsx, y: tsy } = this.geometry.tileSheet.getTileRect(this.tileId)
    return rects.map(rect => ({
      tileId: this.tileId,
      sx: tsx + rect.x,
      sy: tsy + rect.y,
      tileSelectionX: rect.x,
      tileSelectionY: rect.y,
      w: rect.w,
      h: rect.h,
      bufferX: rect.x - originX,
      bufferY: rect.y - originY,
      mask: rect.mask,
    }))
  }

  getOriginalTileAlignedRects(): TileOriginTileAlignedRect[] {
    return this.tileAlignedFrom(this.originalRects, this.originalRectsBounds.x, this.originalRectsBounds.y)
  }

  getCurrentTileAlignedRects(): TileOriginTileAlignedRect[] {
    const b = this.getCurrentTileBounds()
    return this.tileAlignedFrom(this.currentRects, b.x, b.y)
  }

  private sheetDrawRectsFor(rects: TileOriginTileAlignedRect[]): DrawRect[] {
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
    return this.sheetDrawRectsFor(this.getOriginalTileAlignedRects())
  }

  getCurrentSheetDrawRects(): DrawRect[] {
    return this.sheetDrawRectsFor(this.getCurrentTileAlignedRects())
  }

  // --- Grid Draw Rects ---
  private gridDrawRectsFor(tileRects: TileOriginTileAlignedRect[]): DrawRect[] {
    return tileRects.flatMap(r => {
      return this.geometry.tileOriginTileAlignedRectToGridRects(r).map(gr => ({
        dx: gr.x,
        dy: gr.y,
        sx: r.bufferX,
        sy: r.bufferY,
        w: gr.w,
        h: gr.h,
        mask: gr.mask ?? undefined,
        tileId: r.tileId,
      }))
    })
  }

  getOriginalGridDrawRects(): DrawRect[] {
    return this.gridDrawRectsFor(this.getOriginalTileAlignedRects())
  }

  getCurrentGridDrawRects(): DrawRect[] {
    return this.gridDrawRectsFor(this.getCurrentTileAlignedRects())
  }

  // --- Tile Bounds & Rects ---
  getOriginalTileRects(tileId: TileId): SelectionRect[] {
    return tileId === this.tileId ? this.originalRects : []
  }

  getCurrentTileRects(tileId: TileId): SelectionRect[] {
    return tileId === this.tileId ? this.currentRects : []
  }

  private getCurrentTileBounds(): Rect {
    return getRectsBounds(this.currentRects)
  }

  // --- Tile Draw Rects ---
  private tileDrawRectsFor(tileRects: TileOriginTileAlignedRect[]): DrawRect[] {
    return tileRects.map(r => ({
      dx: r.tileSelectionX,
      dy: r.tileSelectionY,
      sx: r.bufferX,
      sy: r.bufferY,
      w: r.w,
      h: r.h,
      mask: r.mask ?? undefined,
      tileId: r.tileId,
    }))
  }

  getOriginalTileDrawRects(tileId: TileId): DrawRect[] {
    return tileId === this.tileId ? this.tileDrawRectsFor(this.getOriginalTileAlignedRects()) : []
  }

  getCurrentTileDrawRects(tileId: TileId): DrawRect[] {
    return tileId === this.tileId ? this.tileDrawRectsFor(this.getCurrentTileAlignedRects()) : []
  }

  // --- Movement & Overlap ---
  moveOnGrid(_dx: number, _dy: number): void {
    throw new Error('tile-origin selection must be promoted before grid movement')
  }

  moveOnTile(dx: number, dy: number, tileId: TileId): void {
    if (dx === 0 && dy === 0 || tileId !== this.tileId) return
    this.moved = true
    this.currentRects = this.currentRects.map(r => ({ ...r, x: r.x + dx, y: r.y + dy }))
  }

  getOverlappingTileIds(): TileId[] {
    return [this.tileId]
  }
}