import type { TileId } from '../../lib/wang-tiles/WangTileset.ts'
import { CanvasType, type LocalToolContext, type ToolInputBindings } from './TileGridEdit/_tile-grid-editor-types.ts'

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

export const DATA_LOCAL_TOOL_ID = 'data-local-tool-id' as const
export const DATA_ATTR_EXCLUDE_SELECT_CANCEL_CLICK = 'data-exclude-select-cancel-click' as const

export type ToolRegistry<T> = {
  [K in keyof typeof Tool]: T
}


export interface BaseEditorState {
  scale: number,

  gridColor: string,
  cursorColor: string,

  mouseLastX: number | null,
  mouseLastY: number | null,

  mouseDownX: number | null,
  mouseDownY: number | null,

  mouseDragStartX: number | null,
  mouseDragStartY: number | null,
  isDragging: boolean,
  dragThreshold: number,

  get shouldDrawGrid(): boolean
}

export type BaseToolHandler<T> = {
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

  inputBindings?: ToolInputBindings<T>,
  onGlobalToolChanging?: (local: LocalToolContext<T>, newTool: Tool, prevTool: Tool | null) => void,
}