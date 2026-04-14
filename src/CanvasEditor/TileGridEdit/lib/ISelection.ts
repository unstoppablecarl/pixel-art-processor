import { type MaskType, type NullableMaskRect, type PixelData } from 'pixel-data-js'
import type { TileId } from '../../../lib/wang-tiles/WangTileset.ts'

export type TileAlignedRect = {
  tileId: TileId

  // sheet space
  sx: number,
  sy: number,

  // all spaces
  w: number
  h: number

  // pixel space
  bufferX: number
  bufferY: number
} & ({
  type: MaskType
  data: Uint8Array
} | {
  type?: null
  data?: null
})

export type TileOriginTileAlignedRect = TileAlignedRect & {
  tileSelectionX: number
  tileSelectionY: number
}

export type GridOriginTileAlignedRect = TileAlignedRect & {
  gridSelectionX: number
  gridSelectionY: number
}

export type DrawRect = {
  tileId: TileId,
  dx: number  // destination x (grid or sheet)
  dy: number  // destination y
  sx: number  // source x inside pixel buffer
  sy: number  // source y inside pixel buffer
  w: number
  h: number
} & ({
  type: MaskType
  data: Uint8Array
} | {
  type?: null
  data?: null
})

export interface ISelection {
  getOriginalTileAlignedRects(): (TileOriginTileAlignedRect | GridOriginTileAlignedRect)[]
  getCurrentTileAlignedRects(): (TileOriginTileAlignedRect | GridOriginTileAlignedRect)[]

  getOriginalSheetDrawRects(): DrawRect[]
  getCurrentSheetDrawRects(): DrawRect[]

  getOriginalTileRects(tileId: TileId): NullableMaskRect[]
  getCurrentTileRects(tileId: TileId): NullableMaskRect[]

  getOriginalTileDrawRects(tileId: TileId): DrawRect[]
  getCurrentTileDrawRects(tileId: TileId): DrawRect[]

  getOriginalGridRects(): NullableMaskRect[]
  getCurrentGridRects(): NullableMaskRect[]

  getOriginalGridDrawRects(): DrawRect[]
  getCurrentGridDrawRects(): DrawRect[]

  moveOnGrid(dx: number, dy: number): void
  moveOnTile(dx: number, dy: number, tileId: TileId): void

  hasMoved(): boolean
  pixels: PixelData

  isLifted: boolean
  lift(): void

  isPasted: boolean
  getOverlappingTileIds(): TileId[]
}