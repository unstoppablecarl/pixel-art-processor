import type { CanvasEditToolStore } from '../../../../lib/store/canvas-edit-tool-store.ts'
import { interpolateLine } from '../../../../lib/util/data/Grid.ts'
import { type BaseBlendModeToolHandler, TOOL_HOVER_CSS_CLASSES } from '../../_core-editor-types.ts'
import { useBrushCursor } from '../../_support/renderers/BrushCursor.ts'
import type { BrushToolState } from '../../_support/tools/BrushToolState.ts'
import type { CanvasPaintToolHandlerRender, LocalToolContext } from '../_canvas-paint-editor-types.ts'

type L = LocalToolContext<BrushToolState>
export type CanvasPaintBrushToolHandler =
  BaseBlendModeToolHandler<L>
  & CanvasPaintToolHandlerRender<L>

export function makeBrushTool(store: CanvasEditToolStore): CanvasPaintBrushToolHandler {
  let isDrawing = false
  const cursor = useBrushCursor()

  return {
    cursorCssClass: TOOL_HOVER_CSS_CLASSES.BRUSH,
    onMouseDown: ({ state, toolState, canvasWriter }, x, y) => {
      isDrawing = true
      canvasWriter.withHistory((mutator) => {
        const pixels = toolState.getBrushPixels(x, y, state.width, state.height)
        mutator.writePoints(pixels, store.brushColor)
      })
    },
    onDragStart({ state, toolState, canvasWriter }, x, y) {
      isDrawing = true
      canvasWriter.withHistory((mutator) => {
        const pixels = toolState.getBrushPixels(x, y, state.width, state.height)
        mutator.writePoints(pixels, store.brushColor)
      })
    },
    onDragMove({ state, canvasRenderer, toolState, canvasWriter }, x, y) {
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
        mutator.writePoints(points, store.brushColor)
      })
    },
    onDragEnd() {
      isDrawing = false
    },
    onMouseMove({ canvasRenderer }, x, y): void {
      // always draw cursor
      canvasRenderer.queueRender()
    },
    onMouseLeave({ canvasRenderer }) {
      // clear cursor when leaving
      canvasRenderer.queueRender()
    },
    screenOverlayDraw({ state, toolState }, ctx) {
      const x = state.mouseX
      const y = state.mouseY
      if (x == null || y == null) return

      const { scale } = state

      cursor.draw(ctx, x, y, scale)
    },
  }
}