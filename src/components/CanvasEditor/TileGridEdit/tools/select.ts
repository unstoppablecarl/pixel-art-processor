import {
  type BinaryMask,
  blendPixelData,
  blendPixelDataBinaryMask,
  type Color32,
  fillPixelData,
  fillPixelDataBinaryMask,
  type NullableMaskRect,
} from 'pixel-data-js'
import type { CanvasEditToolStore } from '../../../../lib/store/canvas-edit-tool-store.ts'
import { type BaseSelectToolHandler } from '../../_core/_core-editor-types.ts'
import {
  drawSelectOutline,
  makeBaseSelectHandler,
  selectMoveBlendModeToBlender32,
} from '../../_core/tools/selection-helpers.ts'
import type {
  TileGridEditorToolContext,
  TileGridEditorToolHandlerArgs,
  TileGridEditorToolHandlerRender,
} from '../_tile-grid-editor-types.ts'
import { CanvasType } from '../_tile-grid-editor-types.ts'
import { mergeAdjacentSelectionRects } from '../lib/SelectionRects.ts'
import { makeTileGridSelectionToolState, type TileGridSelectionToolState } from './states/TileGridSelectionToolState.ts'

export type TileGridSelectToolHandler =
  & BaseSelectToolHandler<TileGridSelectionToolState, TileGridEditorToolHandlerArgs>
  & TileGridEditorToolHandlerRender

export function makeSelectTool(
  {
    state,
    gridRenderer,
    tileSheetWriter,
  }: TileGridEditorToolContext,
  store: CanvasEditToolStore,
): TileGridSelectToolHandler {

  const toolState = makeTileGridSelectionToolState({
    state,
    tileSheetWriter,
    gridRenderer,
  })

  return {
    toolState,
    ...makeBaseSelectHandler(toolState),
    onDeselect() {
      toolState.clearSelection()
    },
    onSubToolChanged() {
      toolState.draw()
    },
    onClick(x, y, canvasType, tileId) {
      const ts = toolState
      const sel = ts.selection

      if (canvasType === CanvasType.GRID) {
        if (!sel) {
          if (ts.inFloodMode()) {
            ts.finalizeFloodSelection(x, y, CanvasType.GRID)
            gridRenderer.queueRenderGrid()
          }
          return
        }

        if (!ts.gridPointInSelection(x, y)) {
          if (ts.selectionHasMoved()) {
            ts.commit()
          } else {
            ts.clearSelection()
            gridRenderer.queueRenderGrid()
          }
          return
        }

        if (ts.inFloodMode()) {
          ts.finalizeFloodSelection(x, y, CanvasType.GRID, null)
          gridRenderer.queueRenderGrid()
        }
      }
      if (canvasType === CanvasType.TILE) {
        if (!tileId) throw new Error('tileId required')

        ts.clearSelection()
        if (ts.tilePointInSelection(x, y, tileId)) {
          return
        }

        if (ts.inFloodMode()) {
          ts.finalizeFloodSelection(x, y, CanvasType.TILE, tileId)
          gridRenderer.queueRenderTile(tileId)
        } else {
          gridRenderer.queueRenderGrid()
        }
      }
    },
    onDragStart(x, y, canvasType, tileId) {
      const ts = toolState
      const sel = ts.selection

      if (canvasType === CanvasType.GRID) {
        if (!sel && !ts.inFloodMode()) {
          ts.gridStartSelection(x, y)
          return
        }

        if (ts.gridPointInSelection(x, y)) {
          ts.gridDragStart(x, y)
          return
        }

        if (!ts.inFloodMode()) {
          ts.gridStartSelection(x, y)
        }
        gridRenderer.queueRenderAll()
      }
      if (canvasType === CanvasType.TILE) {
        if (!tileId) throw new Error('tileId required')

        if (!sel && !ts.inFloodMode()) {
          ts.tileStartSelection(tileId, x, y)
          return
        }

        if (ts.tilePointInSelection(x, y, tileId)) {
          ts.tileDragStart(x, y, tileId)
          return
        }

        if (!ts.inFloodMode()) {
          ts.tileStartSelection(tileId, x, y)
        }
        gridRenderer.queueRenderTile(tileId)
        gridRenderer.queueRenderGrid()
      }
    },
    onDragMove(x, y, canvasType, tileId) {
      const ts = toolState

      if (canvasType === CanvasType.GRID) {
        if (ts.dragging) {
          ts.moveSelectionOnGrid(x, y)
        } else if (ts.selecting) {
          ts.updateSelection(x, y)
        }
        gridRenderer.queueRenderAll()
      }
      if (canvasType === CanvasType.TILE) {
        if (!tileId) throw new Error('tileId required')

        if (ts.dragging) {
          ts.moveSelectionOnTile(x, y, tileId)
        } else if (ts.selecting) {
          ts.updateSelection(x, y)
        }
        gridRenderer.queueRenderTile(tileId)
        gridRenderer.queueRenderGrid()
      }
    },
    onDragEnd() {
      const ts = toolState

      if (ts.selecting) {
        ts.finalizeSelection()
      }

      if (ts.dragging) {
        ts.dragEnd()
      }

      gridRenderer.queueRenderAll()
    },
    gridPixelOverlayDraw(ctx) {
      const sel = toolState.selection
      if (!sel) return

      const mode = store.selectMoveBlendMode
      const blender = selectMoveBlendModeToBlender32[mode]!
      const preview = gridRenderer.tileGridPixelDataRef.copy()!

      // 1. Clear original pixels
      for (const r of sel.getOriginalGridDrawRects()) {
        if (r.data) {
          fillPixelDataBinaryMask(preview, 0 as Color32, r as BinaryMask, r.dx, r.dy)
        } else {
          fillPixelData(preview, 0 as Color32, r.dx, r.dy, r.w, r.h)
        }
      }

      // 2. Draw current pixels
      for (const r of sel.getCurrentGridDrawRects()) {
        const opts = {
          x: r.dx,
          y: r.dy,
          sx: r.sx,
          sy: r.sy,
          w: r.w,
          h: r.h,
          blendFn: blender,
        }
        if (r.data) {
          blendPixelDataBinaryMask(preview, sel.pixels, r as BinaryMask, opts)
        } else {
          blendPixelData(preview, sel.pixels, opts)
        }
      }

      ctx.putImageData(preview.imageData, 0, 0)
    },
    gridScreenOverlayDraw(ctx) {
      const sel = toolState.selection
      const { scale } = state

      if (!sel) {
        const rects = toolState.currentDraggedRectsGrid
        if (!rects) return
        for (const r of rects) {
          drawSelectOutline(ctx, scale, r, store.cursorColorCss)
        }
        return
      }

      const rects = sel.getCurrentGridDrawRects()
        .map(({ dx, dy, w, h, data, type }) => ({
          x: dx, y: dy, w, h, data, type,
        })) as NullableMaskRect[]

      const merged = mergeAdjacentSelectionRects(rects)

      // Draw unsplit selection outline
      for (const g of merged) {
        drawSelectOutline(
          ctx,
          scale,
          g,
          store.cursorColorCss,
        )
      }
    },
    tilePixelOverlayDraw(ctx, tileId) {
      const sel = toolState.selection
      if (!sel) return

      const mode = store.selectMoveBlendMode
      const blender = selectMoveBlendModeToBlender32[mode]
      const preview = state.tileSheet.extractTile(tileId)

      if (sel.hasMoved()) {
        for (const r of sel.getOriginalTileDrawRects(tileId)) {
          const opts = {
            x: r.dx,
            y: r.dy,
            w: r.w,
            h: r.h,
          }

          if (r.data) {
            blendPixelDataBinaryMask(preview, sel.pixels, r as BinaryMask, opts)
          } else {
            blendPixelData(preview, sel.pixels, opts)
          }
        }
      }
      for (const r of sel.getCurrentTileDrawRects(tileId)) {
        const opts = {
          x: r.dx,
          y: r.dy,
          sx: r.sx,
          sy: r.sy,
          w: r.w,
          h: r.h,
          blendFn: blender,
        }

        if (r.data) {
          blendPixelDataBinaryMask(preview, sel.pixels, r as BinaryMask, opts)
        } else {
          blendPixelData(preview, sel.pixels, opts)
        }
      }

      ctx.putImageData(preview.imageData, 0, 0)
    },
    tileScreenOverlayDraw(ctx, tileId) {
      const sel = toolState.selection
      const { scale } = state

      if (sel) {
        for (const r of sel.getCurrentTileDrawRects(tileId)) {
          drawSelectOutline(
            ctx,
            scale,
            { x: r.dx, y: r.dy, w: r.w, h: r.h },
            store.cursorColorCss,
          )
        }
      } else {
        const r = toolState.currentDraggedRectTile
        if (!r) return
        if (r.tileId !== tileId) return
        drawSelectOutline(ctx, scale, r, store.cursorColorCss)
      }
    },
  }
}