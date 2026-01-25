import { type BlendFn, blendIgnoreTransparent, blendSourceAlphaOver } from '../../../lib/util/html-dom/blit.ts'
import { putImageDataScaled } from '../../../lib/util/html-dom/ImageData.ts'
import type { ToolHandler } from '../_canvas-editor-types.ts'
import { CanvasType, SelectMoveBlendMode, Tool } from '../_canvas-editor-types.ts'
import type { EditorState } from '../EditorState.ts'
import type { GlobalToolContext } from '../GlobalToolManager.ts'
import type { TileGridRenderer } from '../TileGridRenderer.ts'
import type { TilesetToolState } from '../TilesetToolState.ts'
import type { TileSheetWriter } from '../TileSheetWriter.ts'

export function makeSelectTool(toolContext: GlobalToolContext): ToolHandler {
  function commit(
    state: EditorState,
    tilesetToolState: TilesetToolState,
    gridRenderer: TileGridRenderer,
    tileSheetWriter: TileSheetWriter,
  ) {
    const sel = tilesetToolState.selection
    if (!sel?.pixels) return

    if (sel.w && sel.h) {
      tileSheetWriter.clearImageDataRect(sel.origX, sel.origY, sel.origW, sel.origH)
      const mode = toolContext.selectMoveBlendMode
      tileSheetWriter.blendImageData(sel.pixels, sel.x, sel.y, mode)
    }

    tilesetToolState.clearSelection()
    gridRenderer.queueRenderAll()
  }

  return {
    // inputBindings: makeCopyPasteKeys(
    //   ({ tilesetToolState }) => {
    //     const sel = tilesetToolState.selection
    //     if (!sel?.pixels) return
    //     clipboard = sel.pixels
    //   },
    //   () => {},
    // ),

    onGlobalToolChanging({ state, tilesetToolState, gridRenderer, tileSheetWriter }, oldTool, newTool) {
      if (oldTool === Tool.SELECT && tilesetToolState.selection) {
        commit(state, tilesetToolState, gridRenderer, tileSheetWriter)
      }
    },

    onDeselect({ gridRenderer, tilesetToolState, tileSheetWriter }) {
      const ts = tilesetToolState
      const pixels = ts.selection?.pixels
      if (!pixels) return

      const affectedTileIds = tileSheetWriter.blendImageData(pixels, ts.selection.x!, ts.selection.y!, toolContext.selectMoveBlendMode)

      gridRenderer.queueRenderTiles(affectedTileIds)
      gridRenderer.queueRenderGrid()

    },

    onDragStart({ tilesetToolState, gridRenderer }, tx, ty, canvasType) {
      if (canvasType !== CanvasType.GRID) return

      const ts = tilesetToolState
      const sel = ts.selection

      if (!sel) {
        ts.startSelection(tx, ty)
        return
      }

      if (ts.inSelection(tx, ty)) {
        ts.dragging.value = true
        sel.offsetX = tx - sel.x
        sel.offsetY = ty - sel.y
        return
      }

      ts.startSelection(tx, ty)
      gridRenderer.queueRenderAll()
    },

    onDragMove({ tilesetToolState, gridRenderer }, tx, ty, canvasType) {
      if (canvasType !== CanvasType.GRID) return

      const ts = tilesetToolState
      const sel = ts.selection
      if (!sel) return

      if (ts.dragging.value) {
        ts.moveSelection(tx, ty)
      } else if (ts.selecting.value) {
        ts.updateSelection(tx, ty)
      }

      gridRenderer.queueRenderAll()
    },

    onDragEnd({ state, tilesetToolState, gridRenderer }, _x, _y, canvasType) {
      if (canvasType !== CanvasType.GRID) return

      const ts = tilesetToolState
      const sel = ts.selection
      if (!sel) return

      if (ts.selecting.value) {
        ts.extractSelectionPixels(gridRenderer.tileGridImageDataRef.get()!)
        ts.selecting.value = false
      }

      ts.dragging.value = false
      gridRenderer.queueRenderAll()
    },

    gridPixelOverlayDraw({ tilesetToolState }, ctx) {
      const sel = tilesetToolState.selection
      if (!sel || !sel.pixels) return
      if (sel.x !== sel.origX || sel.y !== sel.origY) {
        ctx.clearRect(sel.origX, sel.origY, sel.origW, sel.origH)
      }
      const mode = toolContext.selectMoveBlendMode
      const blendMode = selectMoveBlendModeToBlendFn[mode]

      putImageDataScaled(ctx, sel.w, sel.h, sel.pixels, sel.x, sel.y, blendMode)
    },

    gridScreenOverlayDraw({ state, tilesetToolState }, ctx) {
      const sel = tilesetToolState.selection
      if (!sel) return

      ctx.strokeStyle = 'cyan'
      ctx.lineWidth = 1
      ctx.strokeRect(
        sel.x * state.scale - 0.5,
        sel.y * state.scale - 0.5,
        sel.w * state.scale + 2,
        sel.h * state.scale + 2,
      )
    },
  }
}

const selectMoveBlendModeToBlendFn: Record<SelectMoveBlendMode, BlendFn | undefined> = {
  [SelectMoveBlendMode.OVERWRITE]: undefined,
  [SelectMoveBlendMode.IGNORE_TRANSPARENT]: blendIgnoreTransparent,
  [SelectMoveBlendMode.IGNORE_SOLID]: blendSourceAlphaOver(0.5),
}