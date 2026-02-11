import type { CanvasEditToolStore } from '../../../../lib/store/canvas-edit-tool-store.ts'
import { clearImageData } from '../../../../lib/util/html-dom/ImageData.ts'
import { type BaseToolHandler, SelectSubTool, type ToolHandlerSubToolChanged } from '../../_core/_core-editor-types.ts'
import {
  drawSelectOutline,
  makeBaseSelectHandler,
  selectMoveBlendModeToWriter,
} from '../../_core/tools/selection-helpers.ts'
import type { CanvasPaintToolContext, CanvasPaintToolHandlerRender } from '../_canvas-paint-editor-types.ts'
import { type CanvasPaintSelectToolState, makeCanvasPaintSelectToolState } from '../CanvasPaintSelectToolState.ts'

export type CanvasPaintSelectToolHandler =
  BaseToolHandler<CanvasPaintSelectToolState>
  & ToolHandlerSubToolChanged<SelectSubTool>
  & CanvasPaintToolHandlerRender

export function makeCanvasPaintSelectTool(
  {
    state,
    canvasRenderer,
    canvasWriter,
  }: CanvasPaintToolContext,
  store: CanvasEditToolStore,
): CanvasPaintSelectToolHandler {
  const toolState = makeCanvasPaintSelectToolState({ state, canvasRenderer, canvasWriter })

  return {
    toolState,
    ...makeBaseSelectHandler(toolState),
    onDeselect() {
      toolState.clearSelection()
    },
    onSubToolChanged() {
      toolState.draw()
    },
    onClick(x, y) {
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
    onDragStart(x, y) {
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
    onDragMove(x, y) {
      const ts = toolState
      if (ts.dragging) {
        ts.moveSelection(x, y)
      } else if (ts.selecting) {
        ts.updateSelection(x, y)
      }
      canvasRenderer.queueRender()
    },
    onDragEnd(_x, _y) {
      const ts = toolState
      if (ts.selecting) {
        ts.finalizeRectSelection()
      }

      if (ts.dragging) {
        ts.dragEnd()
      }
      canvasRenderer.queueRender()
    },
    pixelOverlayDraw(ctx) {
      const sel = toolState.selection
      if (!sel) return

      const mode = store.selectMoveBlendMode
      const writer = selectMoveBlendModeToWriter[mode]!
      const preview = state.imageDataRef.copy()!

      // Clear original region
      if (toolState.selectionHasMoved()) {
        clearImageData(preview, sel.original.x, sel.original.y, sel.original.w, sel.original.h, sel.mask)
      }

      // Draw moved selection
      writer(preview, sel.pixels, {
        dx: sel.current.x,
        dy: sel.current.y,
        mask: sel.mask,
      })

      ctx.putImageData(preview, 0, 0)
    },
    screenOverlayDraw(ctx) {
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
