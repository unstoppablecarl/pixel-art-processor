import type { CanvasEditToolStore } from '../../../lib/store/canvas-edit-tool-store.ts'
import { type BaseToolHandler, BrushSubTool, type ToolHandlerSubToolChanged } from '../../_core/_core-editor-types.ts'
import { useBrushCursor } from '../../_core/data/Brush.ts'
import type { CanvasPaintToolContext, CanvasPaintToolHandlerRender } from '../_canvas-paint-editor-types.ts'
import { type CanvasPaintBrushToolState, makeCanvasPaintBrushToolState } from './states/CanvasPaintBrushToolState.ts'

export type CanvasPaintBrushToolHandler =
  BaseToolHandler<CanvasPaintBrushToolState>
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

  const toolState = makeCanvasPaintBrushToolState({ store, canvasWriter, canvasRenderer })

  return {
    toolState,
    onMouseDown: (x, y) => {
      isDrawing = true
      toolState.write(x, y)
    },
    onDragStart(x, y) {
      isDrawing = true
      toolState.write(x, y)
    },
    onDragMove(x, y) {
      if (!isDrawing) return
      const { mouseLastX, mouseLastY } = state
      if (mouseLastX == null || mouseLastY == null) return

      toolState.write(x, y, mouseLastX, mouseLastY)
    },
    onDragEnd() {
      isDrawing = false
      toolState.commit()
    },
    onMouseMove(x, y): void {
      // always draw cursor
      canvasRenderer.queueRender()
    },
    onClick() {
      toolState.commit()
    },
    onMouseLeave() {
      // clear cursor when leaving
      canvasRenderer.queueRender()
    },
    pixelOverlayDraw(ctx) {
      canvasWriter.renderer.draw(ctx)
    },
    screenOverlayDraw(ctx) {
      const x = state.mouseX
      const y = state.mouseY
      if (x == null || y == null) return

      cursor.draw(ctx, x, y)
    },
  }
}