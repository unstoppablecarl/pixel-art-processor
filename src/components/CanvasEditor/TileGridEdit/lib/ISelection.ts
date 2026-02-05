import { type Rect } from '../../../../lib/util/data/Rect.ts'
import type { TileId } from '../../../../lib/wang-tiles/WangTileset.ts'

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
