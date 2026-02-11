import type { TileId } from '../../../lib/wang-tiles/WangTileset.ts'
import type { TileSheetWriter } from './data/TileSheetWriter.ts'
import type { TileGridRenderer } from './renderers/TileGridRenderer.ts'
import type { TileGridEditorState } from './TileGridEditorState.ts'

export enum CanvasType {
  GRID = 'GRID',
  TILE = 'TILE'
}

export type TileGridEditorToolContext = {
  state: TileGridEditorState,
  gridRenderer: TileGridRenderer,
  tileSheetWriter: TileSheetWriter,
}

export type TileGridEditorToolHandlerArgs = [canvasType: CanvasType, tileId?: TileId]

export type TileGridEditorToolHandlerRender = {
  gridPixelOverlayDraw?: (ctx: CanvasRenderingContext2D) => void,
  gridScreenOverlayDraw?: (ctx: CanvasRenderingContext2D) => void,

  tilePixelOverlayDraw?: (ctx: CanvasRenderingContext2D, tileId: TileId) => void,
  tileScreenOverlayDraw?: (ctx: CanvasRenderingContext2D, tileId: TileId) => void,
}