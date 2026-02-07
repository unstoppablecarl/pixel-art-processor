import { Tool } from '../_core-editor-types.ts'
import type { BrushToolState } from '../_support/tools/BrushToolState.ts'
import type { CanvasPaintEditorState } from './CanvasPaintEditorState.ts'
import type { CanvasPaintSelectToolState } from './CanvasPaintSelectToolState.ts'
import type { CanvasRenderer } from './CanvasRenderer.ts'
import type { CanvasPaintWriter } from './data/CanvasPaintWriter.ts'

export type BaseLocalToolContext = {
  state: CanvasPaintEditorState,
  canvasRenderer: CanvasRenderer,
  canvasWriter: CanvasPaintWriter
}

export type LocalToolContext<T> = BaseLocalToolContext & {
  toolState: T,
}

export type CanvasPaintToolHandlerRender<L> = {
  pixelOverlayDraw?: (local: L, ctx: CanvasRenderingContext2D) => void,
  screenOverlayDraw?: (local: L, ctx: CanvasRenderingContext2D) => void,
}

export type LocalToolStates = {
  [Tool.BRUSH]: BrushToolState,
  [Tool.SELECT]: CanvasPaintSelectToolState
}

export type LocalToolContexts = { [K in Tool]: LocalToolContext<LocalToolStates[K]> }