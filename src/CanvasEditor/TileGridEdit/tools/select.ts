import { type NullableMaskRect } from '../../../../../pixel-data-js/src'
import type { CanvasEditToolStore } from '../../../lib/store/canvas-edit-tool-store.ts'
import { type BaseSelectToolHandler, SelectMoveMode } from '../../_core/_core-editor-types.ts'
import {
  drawSelectOutline,
  makeBaseSelectHandler,
  selectMoveBlendModeToBlender32,
} from '../../_core/tools/selection-helpers.ts'
import type { SelectUIContext } from '../../_core/tools/state/SelectUIContext.ts'
import type {
  TileGridEditorToolContext,
  TileGridEditorToolHandlerArgs,
  TileGridEditorToolHandlerRender,
} from '../_tile-grid-editor-types.ts'
import { CanvasType } from '../_tile-grid-editor-types.ts'
import { mergeAdjacentSelectionRects } from '../lib/SelectionRects.ts'
import { blendSheetDrawRect, clearSheetDrawRect } from '../lib/TileGrid-blenders.ts'
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
  uiContext: SelectUIContext,
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
    onMouseMove(x, y, canvasType, tileId) {
      const ts = toolState

      let mouseOver = false
      if (canvasType === CanvasType.GRID) {
        mouseOver = ts.gridPointInSelection(x, y)
      } else if (canvasType === CanvasType.TILE) {
        mouseOver = ts.tilePointInSelection(x, y, tileId!)
      }

      uiContext.setCursorState(mouseOver)
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
          if (store.selectionMoveMode === SelectMoveMode.CONTENT) {
            ts.startMovingContent()
          } else {
            ts.startMovingSelection()
          }
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
          if (store.selectionMoveMode === SelectMoveMode.CONTENT) {
            ts.startMovingContent()
          } else {
            ts.startMovingSelection()
          }
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
    onCopy() {
      toolState.copySelection()
    },
    onCut() {
      toolState.cutSelection()
    },
    onPaste(e) {
      toolState.pasteSelection(e).then(() => {
        gridRenderer.queueRenderGrid()
      })
    },
    gridPixelOverlayDraw(ctx) {
      const sel = toolState.selection
      if (!sel) return
      if (!sel.isLifted) return

      const mode = store.selectMoveBlendMode
      const blendFn = selectMoveBlendModeToBlender32[mode]!
      const preview = gridRenderer.tileGridPixelDataRef.copy()!

      // 1. Clear original pixels
      if (sel.hasMoved() && !sel.isPasted) {
        for (const r of sel.getOriginalGridDrawRects()) {
          clearSheetDrawRect(preview, r)
        }
      }

      // 2. Draw current pixels
      for (const r of sel.getCurrentGridDrawRects()) {
        blendSheetDrawRect(preview, r, sel.pixels, blendFn)
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
      if (!sel.isLifted) return

      const mode = store.selectMoveBlendMode
      const blendFn = selectMoveBlendModeToBlender32[mode]
      const preview = state.tileSheet.extractTile(tileId)

      if (sel.hasMoved()) {
        for (const r of sel.getOriginalTileDrawRects(tileId)) {
          clearSheetDrawRect(preview, r)
        }
      }
      for (const r of sel.getCurrentTileDrawRects(tileId)) {
        blendSheetDrawRect(preview, r, sel.pixels, blendFn)
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