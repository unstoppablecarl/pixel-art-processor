import type { GlobalToolContext } from '../../../../lib/store/canvas-edit-tool-store.ts'
import { interpolateLine } from '../../../../lib/util/data/Grid.ts'
import { type BaseBrushToolHandler } from '../../_core-editor-types.ts'
import { useBrushCursor } from '../../_support/BrushCursor.ts'
import type { BrushToolState } from '../../_support/BrushToolState.ts'
import type { CanvasPaintToolHandlerRender, LocalToolContext } from '../_canvas-paint-editor-types.ts'

type L = LocalToolContext<BrushToolState>
export type CanvasPaintBrushToolHandler =
  BaseBrushToolHandler<L>
  & CanvasPaintToolHandlerRender<L>

export function makeBrushTool(toolContext: GlobalToolContext): CanvasPaintBrushToolHandler {
  let isDrawing = false
  const cursor = useBrushCursor()

  return {
    onMouseDown: ({ state, toolState, canvasRenderer }, x, y) => {
      isDrawing = true
      toolState.writeBrushPixels(state.imageDataRef.get()!, x, y, state.width, state.height)
      state.imageDataDirty = true
      canvasRenderer.queueRender()
    },
    onDragStart({ state, toolState, canvasRenderer }, x, y) {
      isDrawing = true
      toolState.writeBrushPixels(state.imageDataRef.get()!, x, y, state.width, state.height)
      state.imageDataDirty = true
      canvasRenderer.queueRender()
    },
    onDragMove({ state, canvasRenderer, toolState }, x, y) {
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

      for (const p of points) {
        toolState.writeBrushPixels(state.imageDataRef.get()!, p.x, p.y, state.width, state.height)
      }

      state.imageDataDirty = true
      canvasRenderer.queueRender()
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
