import type { TileId } from '../../lib/wang-tiles/WangTileset.ts'
import type { EditorState } from './EditorState.ts'
import type { TileGridRenderer } from './TileGridRenderer.ts'
import type { TilesetToolState } from './TilesetToolState.ts'
import type { TileSheetWriter } from './TileSheetWriter.ts'

export enum CanvasType {
  GRID = 'GRID',
  TILE = 'TILE'
}

export type LocalToolContext = {
  state: EditorState,
  gridRenderer: TileGridRenderer,
  tilesetToolState: TilesetToolState,
  tileSheetWriter: TileSheetWriter,
}

export type ToolInputBindings = Record<string, (local: LocalToolContext, event: KeyboardEvent) => void>

export type ToolHandler = {
  onMouseMove?: (local: LocalToolContext, x: number, y: number, canvasType: CanvasType, tileId?: TileId) => void,
  onMouseDown?: (local: LocalToolContext, x: number, y: number, canvasType: CanvasType, tileId?: TileId) => void,
  onMouseUp?: (local: LocalToolContext, x: number, y: number, canvasType: CanvasType, tileId?: TileId) => void,
  onMouseLeave?: (local: LocalToolContext, canvasType: CanvasType, tileId?: TileId) => void,

  onDragStart?: (local: LocalToolContext, x: number, y: number, canvasType: CanvasType, tileId?: TileId) => void,
  onDragMove?: (local: LocalToolContext, x: number, y: number, canvasType: CanvasType, tileId?: TileId) => void,
  onDragEnd?: (local: LocalToolContext, x: number, y: number, canvasType: CanvasType, tileId?: TileId) => void,
  onClick?: (local: LocalToolContext, x: number, y: number, canvasType: CanvasType, tileId?: TileId) => void,

  onSelect?: (local: LocalToolContext) => void,
  onDeselect?: (local: LocalToolContext) => void,
  gridPixelOverlayDraw?: (local: LocalToolContext, ctx: CanvasRenderingContext2D) => void,
  gridScreenOverlayDraw?: (local: LocalToolContext, ctx: CanvasRenderingContext2D) => void,

  tilePixelOverlayDraw?: (local: LocalToolContext, ctx: CanvasRenderingContext2D, tileId: TileId) => void,
  tileScreenOverlayDraw?: (local: LocalToolContext, ctx: CanvasRenderingContext2D, tileId: TileId) => void,

  inputBindings?: ToolInputBindings,
  onGlobalToolChanging?: (local: LocalToolContext, newTool: Tool, prevTool: Tool | null) => void,
}

export enum Tool {
  BRUSH = 'BRUSH',
  // SELECT = 'SELECT'
}

export type DrawLayer = (ctx: CanvasRenderingContext2D, offX?: number, offY?: number) => void

export enum BrushMode {
  ADD = 'ADD',
  REMOVE = 'REMOVE'
}

export type Selection = {
  x: number
  y: number
  w: number
  h: number
  pixels: ImageData | null
  dragging: boolean
  offsetX: number
  offsetY: number

  origX: number
  origY: number
  origW: number
  origH: number
}
