import type { TileId } from '../../lib/wang-tiles/WangTileset.ts'
import { Tool } from '../CanvasPaint/_canvas-paint-types.ts'
import type { EditorState } from './EditorState.ts'
import type { TileGridRenderer } from './renderers/TileGridRenderer.ts'
import type { SelectionLocalToolState } from './SelectionLocalToolState.ts'
import type { TileSheetWriter } from './TileSheetWriter.ts'

export enum CanvasType {
  GRID = 'GRID',
  TILE = 'TILE'
}

export type BaseLocalToolContext = {
  state: EditorState,
  gridRenderer: TileGridRenderer,
  tileSheetWriter: TileSheetWriter,
}

export type LocalToolContext<T> = BaseLocalToolContext & {
  toolState: T,
}

export type ToolInputBindings<T> = Record<string, (local: LocalToolContext<T>, event: KeyboardEvent) => void>

export type ToolHandler<T> = {
  onMouseMove?: (local: LocalToolContext<T>, x: number, y: number, canvasType: CanvasType, tileId?: TileId) => void,
  onMouseDown?: (local: LocalToolContext<T>, x: number, y: number, canvasType: CanvasType, tileId?: TileId) => void,
  onMouseUp?: (local: LocalToolContext<T>, x: number, y: number, canvasType: CanvasType, tileId?: TileId) => void,
  onMouseLeave?: (local: LocalToolContext<T>, canvasType: CanvasType, tileId?: TileId) => void,

  onDragStart?: (local: LocalToolContext<T>, x: number, y: number, canvasType: CanvasType, tileId?: TileId) => void,
  onDragMove?: (local: LocalToolContext<T>, x: number, y: number, canvasType: CanvasType, tileId?: TileId) => void,
  onDragEnd?: (local: LocalToolContext<T>, x: number, y: number, canvasType: CanvasType, tileId?: TileId) => void,
  onClick?: (local: LocalToolContext<T>, x: number, y: number, canvasType: CanvasType, tileId?: TileId) => void,

  onSelect?: (local: LocalToolContext<T>) => void,
  onDeselect?: (local: LocalToolContext<T>) => void,
  gridPixelOverlayDraw?: (local: LocalToolContext<T>, ctx: CanvasRenderingContext2D) => void,
  gridScreenOverlayDraw?: (local: LocalToolContext<T>, ctx: CanvasRenderingContext2D) => void,

  tilePixelOverlayDraw?: (local: LocalToolContext<T>, ctx: CanvasRenderingContext2D, tileId: TileId) => void,
  tileScreenOverlayDraw?: (local: LocalToolContext<T>, ctx: CanvasRenderingContext2D, tileId: TileId) => void,

  inputBindings?: ToolInputBindings<T>,
  onGlobalToolChanging?: (local: LocalToolContext<T>, newTool: Tool, prevTool: Tool | null) => void,
}

export type LocalToolStates = {
  [Tool.BRUSH]: {},
  [Tool.SELECT]: SelectionLocalToolState
}

export type LocalToolContexts = { [K in Tool]: LocalToolContext<LocalToolStates[K]> }