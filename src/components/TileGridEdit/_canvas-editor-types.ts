import type { TileId } from '../../lib/wang-tiles/WangTileset.ts'
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

export enum Tool {
  BRUSH = 'BRUSH',
  SELECT = 'SELECT'
}

export type DrawLayer = (ctx: CanvasRenderingContext2D, offX?: number, offY?: number) => void

export enum BrushMode {
  ADD = 'ADD',
  REMOVE = 'REMOVE'
}

export enum BlendMode {
  OVERWRITE = 'OVERWRITE',
  IGNORE_TRANSPARENT = 'IGNORE_TRANSPARENT',
  IGNORE_SOLID = 'IGNORE_SOLID'
}

export type Selection = {
  x: number
  y: number
  w: number
  h: number
  pixels: ImageData | null
  offsetX: number
  offsetY: number

  origX: number
  origY: number
  origW: number
  origH: number
}

export const DATA_LOCAL_TOOL_ID = 'data-local-tool-id' as const

export const DATA_ATTR_EXCLUDE_SELECT_CANCEL_CLICK = 'data-exclude-select-cancel-click' as const