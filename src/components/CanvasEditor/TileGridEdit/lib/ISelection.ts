import { type Rect } from '../../../../lib/util/data/Rect.ts'
import type { TileId } from '../../../../lib/wang-tiles/WangTileset.ts'

// all in grid space
export type GridSelectionRect = {
  x: number
  y: number
  w: number
  h: number
  mask: Uint8Array | null
}

// internal normalized structure for all spaces
export type TileAlignedRect = {
  tileId: TileId
  // selection space
  selectionX: number
  selectionY: number
  w: number
  h: number
  // pixel space
  bufferX: number
  bufferY: number
  mask: Uint8Array | null
}

export type SheetAlignedRect = {
  // sheet-space source coordinates
  x: number
  y: number

  // clipped width/height
  w: number
  h: number

  // buffer-local offsets (same as TileAlignedRect)
  bufferX: number
  bufferY: number

  mask?: Uint8Array | null
}

export interface DrawRect {
  dx: number  // destination x (grid or sheet)
  dy: number  // destination y
  sx: number  // source x inside pixel buffer
  sy: number  // source y inside pixel buffer
  w: number
  h: number
  mask?: Uint8Array | null
}

export interface ISelection {
  // --- GEOMETRY (selection-local) ---
  getOriginalTileAlignedRects(): TileAlignedRect[]
  getCurrentTileAlignedRects(): TileAlignedRect[]

  // --- GRID PROJECTION (grid-pixel space) ---
  getOriginalDrawRectsForGrid(): DrawRect[]
  getCurrentDrawRectsForGrid(): DrawRect[]

  // --- SHEET PROJECTION (sheet-pixel space) ---
  getOriginalDrawRectsForSheet(): DrawRect[]
  getCurrentDrawRectsForSheet(): DrawRect[]

  // --- FOOTPRINTS (grid-space only) ---
  getOriginalGridFootprint(): GridSelectionRect[]
  getCurrentGridFootprint(): GridSelectionRect[]

  // --- MOVEMENT ---
  moveOnGrid(dx: number, dy: number): void
  moveOnTile(dx: number, dy: number, tileId: TileId): void

  // --- STATE ---
  hasMoved(): boolean
  pixels: ImageData
  tileSheetBounds: Rect

  // --- DRAG ORIGINS ---
  startGridDrag(gx: number, gy: number): void
  startTileDrag(tx: number, ty: number, tileId: TileId): void

  // --- UTILITY ---
  getOverlappingTileIds(): TileId[]
}
