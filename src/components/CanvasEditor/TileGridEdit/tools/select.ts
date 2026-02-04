import type { CanvasEditToolStore } from '../../../../lib/store/canvas-edit-tool-store.ts'
import { clearImageData, clearImageDataRect } from '../../../../lib/util/html-dom/ImageData.ts'
import { type BaseBlendModeToolHandler, TOOL_HOVER_CSS_CLASSES } from '../../_core-editor-types.ts'
import { drawSelectOutline, selectMoveBlendModeToWriter } from '../../_support/tools/selection-helpers.ts'
import type {
  LocalToolContext,
  TileGridEditorToolHandlerArgs,
  TileGridEditorToolHandlerRender,
} from '../_tile-grid-editor-types.ts'
import { CanvasType } from '../_tile-grid-editor-types.ts'
import type { TileGridSelectionToolState } from '../TileGridSelectionToolState.ts'

export type TileGridSelectToolHandler<L = LocalToolContext<TileGridSelectionToolState>> =
  BaseBlendModeToolHandler<L, TileGridEditorToolHandlerArgs>
  & TileGridEditorToolHandlerRender<L>

export function makeSelectTool(store: CanvasEditToolStore): TileGridSelectToolHandler {

  return {
    cursorCssClass: TOOL_HOVER_CSS_CLASSES.SELECT,
    onDeselect({ toolState }) {
      toolState.clearSelection()
    },
    onModeChanged({ toolState }) {
      toolState.draw()
    },
    onClick({ state, toolState, gridRenderer, tileSheetWriter }, x, y, canvasType, tileId) {
      const ts = toolState
      const sel = ts.selection

      if (canvasType === CanvasType.GRID) {
        if (!sel) {
          if (ts.inFloodMode()) {
            ts.finalizeFloodSelection(x, y, canvasType)
          }
          return
        }

        if (!ts.gridPointInSelection(x, y)) {
          if (ts.selectionHasMoved()) {
            ts.commit(store.selectMoveBlendMode)
            return
          } else {
            ts.clearSelection()
            gridRenderer.queueRenderGrid()
          }
        }
        if (ts.inFloodMode()) {
          ts.finalizeFloodSelection(x, y, canvasType)
          gridRenderer.queueRenderGrid()

        }
      } else {
        if (!ts.tilePointInSelection(x, y, tileId!)) {
          ts.commit(store.selectMoveBlendMode)
          return
        }

        if (ts.inFloodMode()) {
          ts.finalizeFloodSelection(x, y, canvasType, tileId)
          gridRenderer.queueRenderGrid()
        }
        gridRenderer.queueRenderGrid()
      }
    },
    onDragStart({ state, toolState, gridRenderer }, x, y, canvasType, tileId) {
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
      } else {
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
    onDragMove({ state, toolState, gridRenderer }, x, y, canvasType, tileId) {
      const ts = toolState

      if (canvasType === CanvasType.GRID) {
        if (ts.dragging) {
          ts.moveSelectionOnGrid(x, y)
        } else if (ts.selecting) {
          ts.updateSelection(x, y)
        }
        gridRenderer.queueRenderAll()
      } else {
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
    onDragEnd({ state, toolState, gridRenderer }, _x, _y, canvasType, tileId) {
      const ts = toolState

      if (ts.selecting) {
        ts.finalizeSelection()
      }

      if (ts.dragging) {
        ts.dragEnd()
      }
      gridRenderer.queueRenderAll()
    },
    gridPixelOverlayDraw({ state, toolState, gridRenderer }, ctx) {
      const sel = toolState.selection
      if (!sel) return

      const { tileGridManager } = state
      const mode = store.selectMoveBlendMode
      const writer = selectMoveBlendModeToWriter[mode]!
      const preview = gridRenderer.tileGridImageDataRef.copy()!
      // 1. Clear original footprint (GRID SPACE)

      for (const r of sel.originalRects) {
        const gridRects = tileGridManager.projectTileSheetRectToGridRects(r)
        for (const g of gridRects) {
          clearImageDataRect(
            preview,
            { x: g.gridX!, y: g.gridY!, w: g.w, h: g.h },
            g.mask,
          )
        }
      }

      // 2. Draw moved selection pixels (GRID SPACE)
      for (const r of sel.currentRects) {
        const gridRects = tileGridManager.projectTileSheetRectToGridRects(r)

        for (const g of gridRects) {
          writer(preview, sel.pixels, {
            dx: g.gridX!,      // dest: grid space
            dy: g.gridY!,
            sx: r.bufferX,     // src: selection buffer (same as commit)
            sy: r.bufferY,
            sw: g.w,
            sh: g.h,
            mask: r.mask ?? undefined,
          })
        }
      }
      ctx.putImageData(preview, 0, 0)
    },
    gridScreenOverlayDraw({ state, toolState }, ctx) {
      const sel = toolState.selection
      const { scale } = state
      if (sel) {
        if (sel.floodFillOrigin) {
          for (const r of sel.currentRects) {
            const gridRects = state.tileGridManager.projectTileSheetRectToGridRects(r)

            for (const g of gridRects) {
              drawSelectOutline(
                ctx,
                scale,
                { x: g.gridX!, y: g.gridY!, w: g.w, h: g.h },
                store.cursorColor,
                g.mask,
              )
            }
          }
        } else {
          // Convert GRID → SCREEN for drawing
          for (const g of toolState.selectionGridSpaceMergedRects()) {
            drawSelectOutline(ctx, scale, g, store.cursorColor)
          }
        }
      } else {
        const r = toolState.currentDraggedRect
        if (!r) return
        drawSelectOutline(ctx, scale, r, store.cursorColor)
      }
    },
    tilePixelOverlayDraw({ state, toolState }, ctx, tileId) {
      const sel = toolState.selection
      if (!sel) return

      const { tileSheet } = state

      const mode = store.selectMoveBlendMode
      const writer = selectMoveBlendModeToWriter[mode]!

      const preview = state.tileSheet.extractTile(tileId)

      // 1. Clear original selection footprint on this tile (if moved)
      if (sel.hasMoved) {
        for (const r of sel.originalRects) {
          if (r.tileId !== tileId) continue

          const {
            x: localX,
            y: localY,
          } = tileSheet.sheetToTileLocal(tileId, r.x, r.y)

          clearImageData(preview, localX, localY, r.w, r.h, r.mask)
        }
      }

      // 2. Draw current selection footprint on this tile
      for (const r of sel.currentRects) {
        if (r.tileId !== tileId) continue

        const {
          x: localX,
          y: localY,
        } = tileSheet.sheetToTileLocal(tileId, r.x, r.y)

        writer(preview, sel.pixels, {
          dx: localX,
          dy: localY,
          sx: r.bufferX,
          sy: r.bufferY,
          sw: r.w,
          sh: r.h,
          mask: r.mask,
        })

        ctx.putImageData(preview, 0, 0)
      }
    },
    tileScreenOverlayDraw({ state, toolState }, ctx, tileId) {
      const sel = toolState.selection
      const { tileSheet, scale } = state
      if (sel) {
        for (const r of sel.currentRects) {
          if (r.tileId !== tileId) continue

          const { x, y } = tileSheet.sheetToTileLocal(tileId, r.x, r.y)
          const { w, h } = r

          drawSelectOutline(ctx, scale, { x, y, w, h }, store.cursorColor)
        }

      } else {
        if (toolState.inputTileId === tileId) {
          const r = toolState.currentDraggedRect
          if (!r) return
          drawSelectOutline(ctx, scale, r, store.cursorColor)
        }
      }
    },
  }
}