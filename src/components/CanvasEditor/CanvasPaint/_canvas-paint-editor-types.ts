import type { CanvasPaintEditorState } from './CanvasPaintEditorState.ts'
import type { CanvasRenderer } from './CanvasRenderer.ts'
import type { CanvasPaintWriter } from './data/CanvasPaintWriter.ts'

export type CanvasPaintToolContext = {
  state: CanvasPaintEditorState,
  canvasRenderer: CanvasRenderer,
  canvasWriter: CanvasPaintWriter
}

export type CanvasPaintToolHandlerRender = {
  pixelOverlayDraw?: (ctx: CanvasRenderingContext2D) => void,
  screenOverlayDraw?: (ctx: CanvasRenderingContext2D) => void,
}