import type { CanvasEditToolStore } from '../../../../lib/store/canvas-edit-tool-store.ts'
import { interpolateLine } from '../../../../lib/util/data/Grid.ts'
import {
  type BaseToolHandler,
  BrushSubTool,
  TOOL_HOVER_CSS_CLASSES,
  type ToolHandlerSubToolChanged,
} from '../../_core/_core-editor-types.ts'
import { useBrushCursor } from '../../_core/renderers/BrushCursor.ts'
import { type BrushToolState, makeBrushToolState } from '../../_core/tools/BrushToolState.ts'
import type { CanvasPaintToolContext, CanvasPaintToolHandlerRender } from '../_canvas-paint-editor-types.ts'

export type CanvasPaintBrushToolHandler =
  BaseToolHandler<BrushToolState>
  & ToolHandlerSubToolChanged<BrushSubTool>
  & CanvasPaintToolHandlerRender

export function makeBrushTool(
  {
    canvasWriter,
    canvasRenderer,
    state,
  }: CanvasPaintToolContext,
  store: CanvasEditToolStore,
): CanvasPaintBrushToolHandler {
  let isDrawing = false
  const cursor = useBrushCursor()

  const toolState = makeBrushToolState({ state })
  return {
    toolState,
    cursorCssClass: TOOL_HOVER_CSS_CLASSES.BRUSH,
    onMouseDown: (x, y) => {
      isDrawing = true
      canvasWriter.withHistory((mutator) => {
        const pixels = toolState.getBrushPixels(x, y, state.width, state.height)
        mutator.writePoints(pixels, store.brushColor)
      })
    },
    onDragStart(x, y) {
      isDrawing = true
      canvasWriter.withHistory((mutator) => {
        const pixels = toolState.getBrushPixels(x, y, state.width, state.height)
        mutator.writePoints(pixels, store.brushColor)
      })
    },
    onDragMove(x, y) {
      if (!isDrawing) return
      const { mouseLastX, mouseLastY } = state
      if (mouseLastX == null || mouseLastY == null) return

      // Interpolate between last position and current position
      const points = interpolateLine(
        Math.floor(mouseLastX!),
        Math.floor(mouseLastY!),
        Math.floor(x),
        Math.floor(y),
      )

      canvasWriter.withHistory((mutator) => {
        const brushPoints = points.flatMap(p => toolState.getBrushPixels(p.x, p.y, state.width, state.height))
        mutator.writePoints(brushPoints, store.brushColor)
      })
    },
    onDragEnd() {
      isDrawing = false
    },
    onMouseMove(x, y): void {
      // always draw cursor
      canvasRenderer.queueRender()
    },
    onMouseLeave() {
      // clear cursor when leaving
      canvasRenderer.queueRender()
    },
    screenOverlayDraw(ctx) {
      const x = state.mouseX
      const y = state.mouseY
      if (x == null || y == null) return

      const { scale } = state

      cursor.draw(ctx, x, y, scale)
    },
  }
}