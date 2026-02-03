import type { CanvasEditToolStore } from '../../../../lib/store/canvas-edit-tool-store.ts'
import { clearImageDataRect, putImageData } from '../../../../lib/util/html-dom/ImageData.ts'
import { type BaseBlendModeToolHandler, TOOL_HOVER_CSS_CLASSES } from '../../_core-editor-types.ts'
import { drawSelectOutline, selectMoveBlendModeToBlendFn } from '../../_support/tools/selection-helpers.ts'
import type { CanvasPaintToolHandlerRender, LocalToolContext } from '../_canvas-paint-editor-types.ts'
import type { CanvasPaintSelectToolState } from '../CanvasPaintSelectToolState.ts'

export type CanvasPaintSelectToolHandler<L = LocalToolContext<CanvasPaintSelectToolState>> =
  BaseBlendModeToolHandler<L>
  & CanvasPaintToolHandlerRender<L>

export function makeCanvasPaintSelectTool(store: CanvasEditToolStore): CanvasPaintSelectToolHandler {
  return {
    cursorCssClass: TOOL_HOVER_CSS_CLASSES.SELECT,
    onDeselect({ toolState }) {
      toolState.clearSelection()
    },
    onModeChanged({ toolState }) {
      toolState.draw()
    },
    onClick({ state, toolState, canvasRenderer }, x, y) {
      const ts = toolState
      const sel = ts.selection
      if (!sel) {
        if (ts.inFloodMode()) {
          ts.finalizeFloodSelection(x, y)
        }
        return
      }

      if (!ts.pointInSelection(x, y)) {
        if (ts.selectionHasMoved()) {
          ts.commit(store.selectMoveBlendMode)
        } else {
          ts.clearSelection()
          canvasRenderer.queueRender()
        }
      }
      if (ts.inFloodMode()) {
        ts.finalizeFloodSelection(x, y)
      }
    },
    onDragStart({ state, toolState, canvasRenderer }, x, y) {
      const ts = toolState
      const sel = ts.selection
      if (!sel && !ts.inFloodMode()) {
        ts.startRectSelection(x, y)
        return
      }

      if (ts.pointInSelection(x, y)) {
        ts.dragStart(x, y)
        return
      }

      if (!ts.inFloodMode()) {
        ts.startRectSelection(x, y)
      }
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
      if (ts.selecting) {
        ts.finalizeRectSelection()
      }

      if (ts.dragging) {
        ts.dragEnd()
      }
      canvasRenderer.queueRender()
    },
    pixelOverlayDraw({ state, toolState }, ctx) {
      const sel = toolState.selection
      if (!sel) return

      const mode = store.selectMoveBlendMode
      const blendMode = selectMoveBlendModeToBlendFn[mode]

      if (toolState.selectionHasMoved()) {
        const r = sel.original
        clearImageDataRect(ctx, r.x, r.y, r.w, r.h, sel.mask)
      }

      putImageData(
        ctx,
        sel.pixels,
        {
          dx: sel.current.x,
          dy: sel.current.y,
          blendMode,
          mask: sel.mask,
        },
      )
    },
    screenOverlayDraw({ state, toolState }, ctx) {
      const sel = toolState.selection
      const { scale } = state
      if (sel) {
        drawSelectOutline(ctx, scale, sel.current, store.cursorColor, sel.mask)
      } else {
        const r = toolState.currentDraggedRect
        if (!r) return
        drawSelectOutline(ctx, scale, r, store.cursorColor)
      }
    },
  }
}
