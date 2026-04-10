import {
  type BinaryMask,
  blendPixelData,
  blendPixelDataBinaryMask,
  type Color32,
  fillPixelData,
  fillPixelDataBinaryMask,
} from 'pixel-data-js'
import type { CanvasEditToolStore } from '../../../../lib/store/canvas-edit-tool-store.ts'
import {
  type BaseToolHandler,
  SelectMoveMode,
  SelectSubTool,
  type ToolHandlerSubToolChanged,
} from '../../_core/_core-editor-types.ts'
import {
  drawSelectOutline,
  makeBaseSelectHandler,
  selectMoveBlendModeToBlender32,
} from '../../_core/tools/selection-helpers.ts'
import type { CanvasPaintToolContext, CanvasPaintToolHandlerRender } from '../_canvas-paint-editor-types.ts'
import { type CanvasPaintSelectToolState, makeCanvasPaintSelectToolState } from './states/CanvasPaintSelectToolState.ts'

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
        if (store.selectionMoveMode === SelectMoveMode.CONTENT) {
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
      const blender = selectMoveBlendModeToBlender32[mode]!
      const preview = state.pixelDataRef.copy()!

      if (!sel.isPasted && toolState.selectionHasMoved()) {

        if (sel.original.data) {
          // Clear original region
          fillPixelDataBinaryMask(preview, 0 as Color32, sel.original as BinaryMask, sel.original.x, sel.original.y)
        } else {
          fillPixelData(preview, 0 as Color32, sel.original)
        }
      }

      // Draw moved selection
      if (sel.current.data) {
        blendPixelDataBinaryMask(preview, sel.pixels, sel.current as BinaryMask, {
          x: sel.current.x,
          y: sel.current.y,
          w: sel.current.w,
          h: sel.current.h,
          blendFn: blender,
        })
      } else {
        blendPixelData(preview, sel.pixels, {
          x: sel.current.x,
          y: sel.current.y,
          w: sel.current.w,
          h: sel.current.h,
          blendFn: blender,
        })
      }

      ctx.putImageData(preview.imageData, 0, 0)
    },
    screenOverlayDraw(ctx) {
      const sel = toolState.selection
      const { scale } = state
      if (sel) {
        drawSelectOutline(ctx, scale, sel.current, store.cursorColorCss)
      } else {
        const r = toolState.currentDraggedRect
        if (!r) return
        drawSelectOutline(ctx, scale, r, store.cursorColorCss)
      }
    },
  }
}

