import type { CanvasEditToolStore } from '../../../../lib/store/canvas-edit-tool-store.ts'
import { blendOverwrite } from '../../../../lib/util/html-dom/blit.ts'
import { putImageDataScaled } from '../../../../lib/util/html-dom/ImageData.ts'
import { type BaseSelectToolHandler, SELECT_HOVER_CSS_CLASS } from '../../_core-editor-types.ts'
import { drawSelectOutline } from '../../_support/tools/selection-helpers.ts'
import type { CanvasPaintToolHandlerRender, LocalToolContext } from '../_canvas-paint-editor-types.ts'
import type { CanvasPaintSelectionToolState } from '../CanvasPaintSelectionToolState.ts'

export type CanvasPaintSelectToolHandler<L = LocalToolContext<CanvasPaintSelectionToolState>> =
  BaseSelectToolHandler<L>
  & CanvasPaintToolHandlerRender<L>

export function makeCanvasPaintSelectTool(store: CanvasEditToolStore): CanvasPaintSelectToolHandler {

  return {
    cursorCssClass: SELECT_HOVER_CSS_CLASS,
    onDeselect({ toolState }) {
      toolState.clearSelection()
    },
    onModeChanged({ toolState }) {
      toolState.draw()
    },
    onClick({ state, toolState, canvasRenderer }, x, y) {
      const ts = toolState
      const sel = ts.selection
      if (!sel) return

      if (!ts.pointInSelection(x, y)) {

        if (ts.selectionHasMoved()) {
          ts.commit(store.selectMoveBlendMode)
        } else {
          ts.clearSelection()
          canvasRenderer.queueRender()
        }
      }
    },
    onDragStart({ state, toolState, canvasRenderer }, x, y) {
      const ts = toolState
      const sel = ts.selection
      if (!sel) {
        ts.startSelection(x, y)
        return
      }

      if (ts.pointInSelection(x, y)) {
        ts.dragStart(x, y)
        return
      }

      ts.startSelection(x, y)
      canvasRenderer.queueRender()
    },
    onDragMove({ state, toolState, canvasRenderer }, x, y) {
      const ts = toolState
      if (ts.dragging) {
        ts.moveSelection(x, y)
      } else if (ts.selecting) {
        ts.updateSelection(x, y)
      }
      canvasRenderer.queueRender()
    },
    onDragEnd({ state, toolState, canvasRenderer }, _x, _y) {
      const ts = toolState

      console.log('dragEnd', ts.selecting)
      if (ts.selecting) {
        ts.finalizeSelection()
      }

      if (ts.dragging) {
        ts.dragEnd()
      }
      canvasRenderer.queueRender()
    },
    pixelOverlayDraw({ state, toolState }, ctx) {
      const sel = toolState.selection
      if (!sel) return

      // const mode = toolContext.selectMoveBlendMode
      // const blendMode = selectMoveBlendModeToBlendFn[mode]

      if (toolState.selectionHasMoved()) {
        const r = sel.original
        ctx.clearRect(r.x, r.y, r.w, r.h)
      }

      putImageDataScaled(
        ctx,
        sel.pixels,
        sel.current.x,
        sel.current.y,
        blendOverwrite,
      )
    },
    screenOverlayDraw({ state, toolState }, ctx) {
      const sel = toolState.selection
      const { scale } = state
      if (sel) {
        drawSelectOutline(ctx, scale, sel.current)
      } else {
        const r = toolState.currentDraggedRect
        if (!r) return
        drawSelectOutline(ctx, scale, r)
      }
    },
  }
}
