import type { EditorState } from './EditorState.ts'
import type { ToolRenderer } from './renderer.ts'

export type LocalTool = {
  state: EditorState,
  renderer: ToolRenderer
}

export type ToolInputBindings = Record<string, (local: LocalTool, event: KeyboardEvent) => void>

type Shared = {
  onMouseMove: (local: LocalTool, x: number, y: number) => void,
  onMouseDown: (local: LocalTool, x: number, y: number) => void,
  onMouseUp: (local: LocalTool, x: number, y: number) => void,
  onMouseLeave: (local: LocalTool) => void,
}
export type ToolHandler = Partial<Shared> & {
  onSelectTool?: (local: LocalTool) => void,
  onUnSelectTool?: (local: LocalTool) => void,
  pixelOverlayDraw?: (local: LocalTool, ctx: CanvasRenderingContext2D) => void,
  screenOverlayDraw?: (local: LocalTool, ctx: CanvasRenderingContext2D) => void,
  inputBindings?: ToolInputBindings,
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