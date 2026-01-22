import type { InputBindings } from '../../lib/util/html-dom/keyboard.ts'
import type { EditorState } from './EditorState.ts'
import type { ToolRenderer } from './renderer.ts'

export type LocalTool = {
  state: EditorState,
  renderer: ToolRenderer
}

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
  inputBindings?: InputBindings,
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