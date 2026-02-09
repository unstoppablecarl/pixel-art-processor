import { getRectsBounds, type Rect } from '../../../../lib/util/data/Rect.ts'
import type { TileId } from '../../../../lib/wang-tiles/WangTileset.ts'
import type { TileGridGeometry } from '../data/TileGridGeometry.ts'
import type { DrawRect, GridOriginTileAlignedRect, ISelection, SelectionRect } from './ISelection.ts'

export class GridOriginSelection implements ISelection {
  private originalRects: SelectionRect[]
  private currentRects: SelectionRect[]
  private originalRectsBounds: Rect
  private moved = false
  pixels: ImageData

  constructor(rects: SelectionRect[], pixels: ImageData, private geometry: TileGridGeometry) {
    this.originalRects = rects
    this.currentRects = rects.map(r => ({ ...r }))
    this.originalRectsBounds = getRectsBounds(rects)
    this.pixels = pixels
  }

  hasMoved(): boolean {
    return this.moved
  }

  private getCurrentGridBounds(): Rect {
    return getRectsBounds(this.currentRects)
  }

  getOriginalGridRects(): SelectionRect[] {
    return this.originalRects
  }

  getCurrentGridRects(): SelectionRect[] {
    return this.currentRects
  }

  // --- Tile Aligned Rects ---
  private tileAlignedFrom(rects: SelectionRect[], originX: number, originY: number): GridOriginTileAlignedRect[] {
    return this.geometry.gridRectsToTileAlignedRects(rects, originX, originY)
  }

  getOriginalTileAlignedRects(): GridOriginTileAlignedRect[] {
    return this.tileAlignedFrom(this.originalRects, this.originalRectsBounds.x, this.originalRectsBounds.y)
  }

  getCurrentTileAlignedRects(): GridOriginTileAlignedRect[] {
    const b = this.getCurrentGridBounds()
    return this.tileAlignedFrom(this.currentRects, b.x, b.y)
  }

  private sheetDrawRectsFor(rects: GridOriginTileAlignedRect[]): DrawRect[] {
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

  getOriginalGridDrawRects(): DrawRect[] {
    return this.geometry.gridRectsToDuplicatedGridDrawRects(this.originalRects, this.originalRectsBounds.x, this.originalRectsBounds.y)
  }

  getCurrentGridDrawRects(): DrawRect[] {
    const b = this.getCurrentGridBounds()
    return this.geometry.gridRectsToDuplicatedGridDrawRects(this.currentRects, b.x, b.y)
  }

  getOriginalTileRects(tileId: TileId): SelectionRect[] {
    throw new Error('not implemented')
  }
  //
  getCurrentTileRects(tileId: TileId): SelectionRect[] {
    throw new Error('not implemented')
  }

  // --- Tile Draw Rects ---
  private tileDrawRectsFor(tileRects: GridOriginTileAlignedRect[], tileId: TileId): DrawRect[] {
    return tileRects
      .filter(r => r.tileId === tileId)
      .map(r => {
        const tile = this.geometry.tileSheet.sheetToTileLocal(tileId, r.sx, r.sy)
        return {
          dx: tile.x,
          dy: tile.y,
          sx: r.bufferX,
          sy: r.bufferY,
          w: r.w,
          h: r.h,
          mask: r.mask ?? undefined,
          tileId: r.tileId,
        }
      })
  }

  getOriginalTileDrawRects(tileId: TileId): DrawRect[] {
    return this.tileDrawRectsFor(this.getOriginalTileAlignedRects(), tileId)
  }

  getCurrentTileDrawRects(tileId: TileId): DrawRect[] {
    return this.tileDrawRectsFor(this.getCurrentTileAlignedRects(), tileId)
  }

  // --- Movement & Overlap ---
  moveOnGrid(dx: number, dy: number): void {
    if (dx === 0 && dy === 0) return
    this.moved = true
    this.currentRects = this.currentRects.map(r => ({ ...r, x: r.x + dx, y: r.y + dy }))
  }

  moveOnTile(dx: number, dy: number, _tileId: TileId): void {
    this.moveOnGrid(dx, dy)
  }

  getOverlappingTileIds(): TileId[] {
    const ids = [...this.getOriginalTileAlignedRects(), ...this.getCurrentTileAlignedRects()].map(r => r.tileId)
    return Array.from(new Set(ids))
  }
}