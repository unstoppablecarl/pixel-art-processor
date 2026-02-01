import type { GlobalToolContext } from '../../../../lib/store/canvas-edit-tool-store.ts'
import { putImageDataScaled } from '../../../../lib/util/html-dom/ImageData.ts'
import { type BaseSelectToolHandler, BlendMode, Tool } from '../../_core-editor-types.ts'
import { drawSelectOutline, selectMoveBlendModeToBlendFn } from '../../_support/selection-helpers.ts'
import type {
  TileGridEditorToolHandlerArgs,
  TileGridEditorToolHandlerRender,
  LocalToolContext,
} from '../_tile-grid-editor-types.ts'
import { CanvasType } from '../_tile-grid-editor-types.ts'
import type { TileGridSelectionToolState } from '../TileGridSelectionToolState.ts'

export type TileGridSelectToolHandler<L = LocalToolContext<TileGridSelectionToolState>> =
  BaseSelectToolHandler<L, TileGridEditorToolHandlerArgs>
  & TileGridEditorToolHandlerRender<L>

export function makeSelectTool(toolContext: GlobalToolContext): TileGridSelectToolHandler {

  return {
    onGlobalToolChanging({ toolState }, oldTool, _newTool) {
      if (oldTool === Tool.SELECT && toolState.selection) {
        // optional: commit on tool change
      }
    },
    onModeChanged({ toolState }) {
      toolState.draw()
    },
    onClick({ state, toolState, gridRenderer, tileSheetWriter }, x, y, canvasType, tileId) {
      const ts = toolState
      const sel = ts.selection
      if (!sel) return

      if (canvasType === CanvasType.GRID) {
        if (!ts.gridPointInSelection(x, y)) {

          if (ts.selectionHasMoved()) {
            ts.commit(toolContext.selectMoveBlendMode)
          } else {
            ts.clearSelection()
            gridRenderer.queueRenderGrid()
          }
        }
      } else {
        if (!ts.tilePointInSelection(tileId!, x, y)) {
          ts.commit(toolContext.selectMoveBlendMode)
        }
        gridRenderer.queueRenderGrid()
      }
    },
    onDragStart({ state, toolState, gridRenderer }, x, y, canvasType, tileId) {
      const ts = toolState
      const sel = ts.selection

      if (canvasType === CanvasType.GRID) {
        if (!sel) {
          ts.gridStartSelection(x, y)
          return
        }

        if (ts.gridPointInSelection(x, y)) {
          ts.gridDragStart(x, y)
          return
        }

        ts.gridStartSelection(x, y)
        gridRenderer.queueRenderAll()
      } else {
        if (!tileId) throw new Error('tileId required')
        if (!sel) {
          ts.tileStartSelection(tileId, x, y)
          return
        }
        if (ts.tilePointInSelection(tileId, x, y)) {
          ts.tileDragStart(x, y, tileId)
          return
        }

        ts.tileStartSelection(tileId, x, y)
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
    gridPixelOverlayDraw({ state, toolState }, ctx) {
      const sel = toolState.selection
      if (!sel) return

      const { tileGridManager } = state
      const mode = toolContext.selectMoveBlendMode
      const blendMode = selectMoveBlendModeToBlendFn[mode]

      // 1. Clear original footprint (GRID SPACE)
      if (sel.hasMoved) {
        for (const r of sel.originalRects) {
          const gridRects = tileGridManager.projectTileSheetRectToGridRects(r)
          for (const g of gridRects) {
            ctx.clearRect(g.x, g.y, g.w, g.h)
          }
        }
      }

      // 2. Draw moved selection pixels (GRID SPACE)
      for (const r of sel.currentRects) {
        const gridRects = tileGridManager.projectTileSheetRectToGridRects(r)

        for (const g of gridRects) {
          const drawX = g.x
          const drawY = g.y

          if (mode === BlendMode.OVERWRITE) {
            ctx.clearRect(drawX, drawY, r.w, r.h)
          }
          putImageDataScaled(
            ctx,
            sel.pixels,
            drawX,
            drawY,
            blendMode,
            r.bufferX,
            r.bufferY,
            r.w,
            r.h,
          )
        }
      }
    },
    gridScreenOverlayDraw({ state, toolState }, ctx) {
      const sel = toolState.selection
      const { scale } = state
      if (sel) {
        // Convert GRID → SCREEN for drawing
        for (const g of toolState.selectionGridSpaceMergedRects()) {
          drawSelectOutline(ctx, scale, g)
        }
      } else {
        const r = toolState.currentDraggedRect
        if (!r) return
        drawSelectOutline(ctx, scale, r)
      }
    },
    tilePixelOverlayDraw({ state, toolState }, ctx, tileId) {
      const sel = toolState.selection
      if (!sel) return

      const { tileSheet } = state
      const composed = sel.pixels

      const mode = toolContext.selectMoveBlendMode
      const blendMode = selectMoveBlendModeToBlendFn[mode]

      // 1. Clear original selection footprint on this tile (if moved)
      if (sel.hasMoved) {
        for (const r of sel.originalRects) {
          if (r.tileId !== tileId) continue

          const {
            x: localX,
            y: localY,
          } = tileSheet.sheetToTileLocal(tileId, r.x, r.y)

          ctx.clearRect(localX, localY, r.w, r.h)
        }
      }

      // 2. Draw current selection footprint on this tile
      for (const r of sel.currentRects) {
        if (r.tileId !== tileId) continue

        const {
          x: localX,
          y: localY,
        } = tileSheet.sheetToTileLocal(tileId, r.x, r.y)

        if (mode === BlendMode.OVERWRITE) {
          ctx.clearRect(localX, localY, r.w, r.h)
        }

        putImageDataScaled(
          ctx,
          composed,
          localX,
          localY,
          blendMode,
          r.bufferX,
          r.bufferY,
          r.w,
          r.h,
        )
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

          drawSelectOutline(ctx, scale, { x, y, w, h })
        }

      } else {
        if (toolState.inputTileId === tileId) {
          const r = toolState.currentDraggedRect
          if (!r) return
          drawSelectOutline(ctx, scale, r)
        }
      }
    },
  }
}