import { type BlendFn, blendIgnoreTransparent, blendSourceAlphaOver } from '../../../lib/util/html-dom/blit.ts'
import { putImageDataScaled } from '../../../lib/util/html-dom/ImageData.ts'
import type { ToolHandler } from '../_canvas-editor-types.ts'
import { CanvasType, SelectMoveBlendMode, Tool } from '../_canvas-editor-types.ts'
import type { GlobalToolContext } from '../GlobalToolManager.ts'
import type { TileGridRenderer } from '../TileGridRenderer.ts'
import type { TilesetToolState } from '../TilesetToolState.ts'
import type { TileSheetWriter } from '../TileSheetWriter.ts'

export function makeSelectTool(toolContext: GlobalToolContext): ToolHandler {
  function commit(
    tilesetToolState: TilesetToolState,
    gridRenderer: TileGridRenderer,
    tileSheetWriter: TileSheetWriter,
  ) {
    const sel = tilesetToolState.selection
    if (!sel?.pixels) return

    if (sel.w && sel.h) {
      tileSheetWriter.clearImageDataRect(sel.origX, sel.origY, sel.origW, sel.origH)
      const mode = toolContext.selectMoveBlendMode
      const affectedTileIds = tileSheetWriter.blendImageData(sel.pixels, sel.x, sel.y, mode)
      gridRenderer.queueRenderTiles(affectedTileIds)
    }
    tilesetToolState.clearSelection()
    gridRenderer.queueRenderGrid()
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
    onGlobalToolChanging({ tilesetToolState, gridRenderer, tileSheetWriter }, oldTool, newTool) {
      if (oldTool === Tool.SELECT && tilesetToolState.selection) {
        commit(tilesetToolState, gridRenderer, tileSheetWriter)
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
        ts.dragging = true
        sel.offsetX = tx - sel.x
        sel.offsetY = ty - sel.y
        return
      }

      ts.startSelection(tx, ty)
      gridRenderer.queueRenderAll()
    },
    onClick({ tilesetToolState, gridRenderer, tileSheetWriter }, x, y, canvasType) {
      const ts = tilesetToolState
      const sel = ts.selection
      if (!sel) return

      if (!ts.inSelection(x, y)) {
        commit(tilesetToolState, gridRenderer, tileSheetWriter)
      }
    },
    onDragMove({ tilesetToolState, gridRenderer }, x, y, canvasType) {
      if (canvasType !== CanvasType.GRID) return
      const ts = tilesetToolState
      const sel = ts.selection
      if (!sel) return

      if (ts.dragging) {
        ts.moveSelection(x, y)
      } else if (ts.selecting) {
        ts.updateSelection(x, y)
      }

      gridRenderer.queueRenderAll()
    },
    onDragEnd({ tilesetToolState, gridRenderer }, _x, _y, canvasType) {
      if (canvasType !== CanvasType.GRID) return

      const ts = tilesetToolState
      const sel = ts.selection
      if (!sel) return

      if (ts.selecting) {
        ts.extractSelectionPixels(gridRenderer.tileGridImageDataRef.get()!)
        ts.selecting = false
      }

      ts.dragging = false
      gridRenderer.queueRenderAll()
    },
    gridPixelOverlayDraw({ tilesetToolState }, ctx) {
      const sel = tilesetToolState.selection
      if (!sel || !sel.pixels) return
      if (sel.x !== sel.origX || sel.y !== sel.origY) {
        ctx.clearRect(sel.origX, sel.origY, sel.origW, sel.origH)
      }
      const mode = toolContext.selectMoveBlendMode
      if (mode === SelectMoveBlendMode.OVERWRITE) {
        ctx.clearRect(sel.x, sel.y, sel.w, sel.h)
      }
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