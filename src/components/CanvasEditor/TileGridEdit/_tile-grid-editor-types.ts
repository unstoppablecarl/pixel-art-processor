import type { TileId } from '../../../lib/wang-tiles/WangTileset.ts'
import { Tool } from '../_core-editor-types.ts'
import type { BrushToolState } from '../_support/BrushToolState.ts'
import type { TileGridRenderer } from './renderers/TileGridRenderer.ts'
import type { TileGridEditorState } from './TileGridEditorState.ts'
import type { TileGridSelectionToolState } from './TileGridSelectionToolState.ts'
import type { TileSheetWriter } from './TileSheetWriter.ts'

export enum CanvasType {
  GRID = 'GRID',
  TILE = 'TILE'
}

export type BaseLocalToolContext = {
  state: TileGridEditorState,
  gridRenderer: TileGridRenderer,
  tileSheetWriter: TileSheetWriter,
}

export type LocalToolContext<T> = BaseLocalToolContext & {
  toolState: T,
}

export type ToolInputBindings<T> = Record<string, (local: LocalToolContext<T>, event: KeyboardEvent) => void>

export type TileGridEditorToolHandlerArgs = [canvasType: CanvasType, tileId?: TileId]

export type TileGridEditorToolHandlerRender<L> = {
  gridPixelOverlayDraw?: (local: L, ctx: CanvasRenderingContext2D) => void,
  gridScreenOverlayDraw?: (local: L, ctx: CanvasRenderingContext2D) => void,

  tilePixelOverlayDraw?: (local: L, ctx: CanvasRenderingContext2D, tileId: TileId) => void,
  tileScreenOverlayDraw?: (local: L, ctx: CanvasRenderingContext2D, tileId: TileId) => void,
}

export type LocalToolStates = {
  [Tool.BRUSH]: BrushToolState,
  [Tool.SELECT]: TileGridSelectionToolState
}

export type LocalToolContexts = { [K in Tool]: LocalToolContext<LocalToolStates[K]> }