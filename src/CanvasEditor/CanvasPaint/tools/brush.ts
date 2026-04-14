import type { CanvasEditToolStore } from '../../../lib/store/canvas-edit-tool-store.ts'
import { type BaseToolHandler, BrushSubTool, type ToolHandlerSubToolChanged } from '../../_core/_core-editor-types.ts'
import { useBrushCursor } from '../../_core/data/Brush.ts'
import { makeBrushAxisLock } from '../../_core/tools/BrushAxisLock.ts'
import type { CanvasPaintToolContext, CanvasPaintToolHandlerRender } from '../_canvas-paint-editor-types.ts'
import { type CanvasPaintBrushToolState, makeCanvasPaintBrushToolState } from './states/CanvasPaintBrushToolState.ts'

export type CanvasPaintBrushToolHandler =
  BaseToolHandler<CanvasPaintBrushToolState>
  & ToolHandlerSubToolChanged<BrushSubTool>
  & CanvasPaintToolHandlerRender

export function makeBrushTool(
  { canvasWriter, canvasRenderer, state }: CanvasPaintToolContext,
  store: CanvasEditToolStore,
): CanvasPaintBrushToolHandler {
  let isDrawing = false
  const cursor = useBrushCursor()
  const toolState = makeCanvasPaintBrushToolState({
    store,
    canvasWriter,
    canvasRenderer,
  })

  const axisLock = makeBrushAxisLock(store)

  return {
    toolState,

    onMouseDown(x, y) {
      isDrawing = true
      axisLock.onMouseDown(x, y)
      toolState.write(x, y)
    },

    onDragStart(x, y) {
      isDrawing = true
      axisLock.onDragStart(x, y)
      toolState.write(x, y)
    },

    onDragMove(x, y) {
      if (!isDrawing) return
      const r = axisLock.onDragMove(x, y)
      canvasRenderer.queueRender()
      if (!r) return
      toolState.write(r.x, r.y, r.lastDrawnX, r.lastDrawnY)
    },

    onDragEnd() {
      isDrawing = false

      axisLock.onDragEnd()
      toolState.commit()
    },

    onMouseMove(): void {
      canvasRenderer.queueRender()
    },

    onClick() {
      toolState.commit()
    },

    onMouseLeave() {
      canvasRenderer.queueRender()
    },

    pixelOverlayDraw(ctx) {
      toolState.draw(ctx)
    },

    screenOverlayDraw(ctx) {
      const x = state.mouseX
      const y = state.mouseY
      if (x == null || y == null) return
      cursor.draw(ctx, x, y)
    },
  }
}