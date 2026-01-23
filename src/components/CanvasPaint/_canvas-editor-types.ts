import type { EditorState } from './EditorState.ts'
import type { ToolRenderer } from './renderer.ts'

export type LocalTool = {
  state: EditorState,
  renderer: ToolRenderer
}

export type ToolInputBindings = Record<string, (local: LocalTool, event: KeyboardEvent) => void>

export type ToolHandler = {
  onMouseMove?: (local: LocalTool, x: number, y: number) => void,
  onMouseDown?: (local: LocalTool, x: number, y: number) => void,
  onMouseUp?: (local: LocalTool, x: number, y: number) => void,
  onMouseLeave?: (local: LocalTool) => void,

  onDragStart?: (local: LocalTool, x: number, y: number) => void,
  onDragMove?: (local: LocalTool, x: number, y: number) => void,
  onDragEnd?: (local: LocalTool, x: number, y: number) => void,
  onClick?: (local: LocalTool, x: number, y: number) => void,

  onSelect?: (local: LocalTool) => void,
  onDeselect?: (local: LocalTool) => void,
  pixelOverlayDraw?: (local: LocalTool, ctx: CanvasRenderingContext2D) => void,
  screenOverlayDraw?: (local: LocalTool, ctx: CanvasRenderingContext2D) => void,
  inputBindings?: ToolInputBindings,
  onGlobalToolChanging?: (local: LocalTool, newTool: Tool, prevTool: Tool | null) => void,
}

export enum Tool {
  BRUSH = 'BRUSH',
  SELECT = 'SELECT'
}

export type DrawLayer = (ctx: CanvasRenderingContext2D) => void

export enum BrushMode {
  ADD = 'ADD',
  REMOVE = 'REMOVE'
}