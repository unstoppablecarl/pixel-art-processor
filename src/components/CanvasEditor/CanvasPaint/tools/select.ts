import { moveSelectionContentButtonIsDown } from '../../../../lib/key-bindings.ts'
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
      canvasRenderer.queueRender()
    },
    onCut() {
      toolState.cutSelection().then(() => {
        canvasRenderer.queueRender()
      })
    },
    onCopy() {
      toolState.copySelection()
      canvasRenderer.queueRender()
    },
    onPaste(e) {
      toolState.pasteSelection(e).then(() => {
        canvasRenderer.queueRender()
      })
    },
    onClick(x, y) {
      const ts = toolState
      const sel = ts.selection
      if (!sel) {
        if (ts.inFloodMode()) {
          ts.createFloodSelection(x, y)
        }
        canvasRenderer.queueRender()
        return
      }

      if (!ts.pointInSelection(x, y)) {
        if (ts.selectionHasMoved()) {
          ts.commit()
        } else {
          ts.clearSelection()
        }
        canvasRenderer.queueRender()
        return
      }

      if (ts.inFloodMode()) {
        ts.createFloodSelection(x, y)
      }
      canvasRenderer.queueRender()
    },
    onDragStart(x, y) {
      const ts = toolState
      const sel = ts.selection
      if (!sel && !ts.inFloodMode()) {
        ts.startRectSelection(x, y)
        canvasRenderer.queueRender()
        return
      }

      if (ts.pointInSelection(x, y)) {
        if (moveSelectionContentButtonIsDown()) {
          console.log('smc')
          ts.startMovingContent(x, y)
        } else {
          ts.startMovingSelection(x, y)
        }
        canvasRenderer.queueRender()
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
        ts.move(x, y)
      } else if (ts.selecting) {
        ts.resizeRectSelection(x, y)
      }
      canvasRenderer.queueRender()
    },
    onDragEnd(_x, _y) {
      const ts = toolState
      if (ts.selecting) {
        ts.endRectSelection()
      }

      if (ts.dragging) {
        ts.endMoving()
      }
      canvasRenderer.queueRender()
    },
    pixelOverlayDraw(ctx) {
      const sel = toolState.selection
      if (!sel?.pixels) return

      const mode = store.selectMoveBlendMode
      const writer = selectMoveBlendModeToWriter[mode]!
      const preview = state.imageDataRef.copy()!

      if (!sel.isPasted && toolState.selectionHasMoved()) {
        // Clear original region
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

