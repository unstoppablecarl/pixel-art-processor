import type { TileId } from '../../../lib/wang-tiles/WangTileset.ts'
import { type BaseToolHandler, Tool } from '../_canvas-editor-types.ts'
import type { TileGridRenderer } from './renderers/TileGridRenderer.ts'
import type { SelectionLocalToolState } from './SelectionLocalToolState.ts'
import type { TileGridEditorState } from './TileGridEditorState.ts'
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

export type ToolHandler<T> = BaseToolHandler<T> & {
  gridPixelOverlayDraw?: (local: LocalToolContext<T>, ctx: CanvasRenderingContext2D) => void,
  gridScreenOverlayDraw?: (local: LocalToolContext<T>, ctx: CanvasRenderingContext2D) => void,

  tilePixelOverlayDraw?: (local: LocalToolContext<T>, ctx: CanvasRenderingContext2D, tileId: TileId) => void,
  tileScreenOverlayDraw?: (local: LocalToolContext<T>, ctx: CanvasRenderingContext2D, tileId: TileId) => void,
}

export type LocalToolStates = {
  [Tool.BRUSH]: {},
  [Tool.SELECT]: SelectionLocalToolState
}

export type LocalToolContexts = { [K in Tool]: LocalToolContext<LocalToolStates[K]> }