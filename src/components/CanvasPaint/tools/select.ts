import { type BlendFn, blendIgnoreTransparent, blendSourceAlphaOver } from '../../../lib/util/html-dom/blit.ts'
import { putImageDataScaled } from '../../../lib/util/html-dom/ImageData.ts'
import type { ToolHandler } from '../_canvas-editor-types.ts'
import { BlendMode, CanvasType, Tool } from '../_canvas-editor-types.ts'
import type { GlobalToolContext } from '../GlobalToolManager.ts'

export function makeSelectTool(toolContext: GlobalToolContext): ToolHandler {

  return {
    onGlobalToolChanging({ tilesetToolState }, oldTool, _newTool) {
      if (oldTool === Tool.SELECT && tilesetToolState.selection) {
        // optional: commit on tool change
      }
    },

    // onDeselect({ gridRenderer, tilesetToolState, tileSheetWriter }) {
    //   const ts = tilesetToolState
    //   const sel = ts.selection
    //   if (!sel?.pixels) return
    //
    //   const affectedTileIds = tileSheetWriter.blendGridImageData(
    //     sel.pixels,
    //     sel.x!,
    //     sel.y!,
    //     toolContext.selectMoveBlendMode,
    //   )
    //
    //   gridRenderer.queueRenderTiles(affectedTileIds)
    //   gridRenderer.queueRenderGrid()
    // },

    onClick({ state, tilesetToolState, gridRenderer, tileSheetWriter }, x, y, canvasType, tileId) {
      const ts = tilesetToolState
      const sel = ts.selection
      if (!sel) return

      if (canvasType === CanvasType.GRID) {
        if (!ts.gridInSelection(x, y)) {
          ts.commit(toolContext.selectMoveBlendMode)
        }
      } else {
        const { x: px, y: py } = state.tileSheet.tileLocalToSheet(tileId!, x, y)
        if (!ts.tileInSelection(tileId!, px, py)) {
          ts.commit(toolContext.selectMoveBlendMode)
        }
        gridRenderer.queueRenderGrid()
      }
    },

    onDragStart({ state, tilesetToolState, gridRenderer }, x, y, canvasType, tileId) {
      const ts = tilesetToolState
      const sel = ts.selection

      if (canvasType === CanvasType.GRID) {
        if (!sel) {
          ts.gridStartSelection(x, y)          // grid-pixel
          return
        }

        if (ts.gridInSelection(x, y)) {
          ts.dragStart(x, y)                   // whatever moveSelection expects
          return
        }

        ts.gridStartSelection(x, y)
        gridRenderer.queueRenderAll()
      } else {
        // x,y are TILE-LOCAL here

        if (!sel) {
          ts.tileStartSelection(tileId!, x, y) // <-- use TILE-LOCAL for selection
          return
        }
        const { x: px, y: py } = state.tileSheet.tileLocalToSheet(tileId!, x, y)

        if (ts.tileInSelection(tileId!, px, py)) {
          ts.dragStart(px, py)                 // dragging existing selection: SHEET coords are fine
          return
        }

        ts.tileStartSelection(tileId!, x, y)   // <-- TILE-LOCAL
        gridRenderer.queueRenderTile(tileId!)
        gridRenderer.queueRenderGrid()
      }
    },

    onDragMove({ state, tilesetToolState, gridRenderer }, x, y, canvasType, tileId) {
      const ts = tilesetToolState

      if (canvasType === CanvasType.GRID) {
        if (ts.dragging) {
          ts.moveSelectionOnGrid(x, y)
        } else if (ts.selecting) {
          ts.updateSelection(x, y)
        }
        gridRenderer.queueRenderAll()
      } else {
        const { x: px, y: py } = state.tileSheet.tileLocalToSheet(tileId!, x, y)
        if (ts.dragging) {
          ts.moveSelection(px, py)
        } else if (ts.selecting) {
          ts.updateSelection(x, y)
        }
        gridRenderer.queueRenderTile(tileId!)
        gridRenderer.queueRenderGrid()
      }
    },
    onDragEnd({ state, tilesetToolState, gridRenderer }, _x, _y, canvasType, tileId) {
      const ts = tilesetToolState
      // console.log('onDragEnd', ts.selection)
      if (ts.selecting) {
        ts.finalizeSelection()
      }

      const sel = ts.selection
      if (!sel) return

      gridRenderer.queueRenderAll()
      // if (canvasType === CanvasType.GRID) {
      //   gridRenderer.queueRenderAll()
      // } else {
      //   gridRenderer.queueRenderTile(tileId!)
      //   gridRenderer.queueRenderGrid()
      // }
    },
    gridPixelOverlayDraw({ state, tilesetToolState }, ctx) {
      const sel = tilesetToolState.selection
      if (!sel) return

      const { tileGridManager, tileSheet } = state
      const composed = sel.toPixels(tileSheet)
      const mode = toolContext.selectMoveBlendMode
      const blendMode = selectMoveBlendModeToBlendFn[mode]

      if (!sel.gridBounds || !sel.initialGridBounds) return

      const dx = sel.gridBounds.x - sel.initialGridBounds.x
      const dy = sel.gridBounds.y - sel.initialGridBounds.y

      // 1. Clear original footprint (GRID SPACE)
      if (sel.hasMoved) {
        for (const r of sel.originalRects) {
          const gridRects = tileGridManager.projectTileSheetRectToGridRects(r)
          for (const g of gridRects) {
            ctx.clearRect(g.x + dx, g.y + dy, g.w, g.h)
          }
        }
      }

      // 2. Draw moved selection pixels (GRID SPACE)
      for (const r of sel.currentRects) {
        const gridRects = tileGridManager.projectTileSheetRectToGridRects(r)

        for (const g of gridRects) {
          const drawX = g.x + dx
          const drawY = g.y + dy

          const sx = r.x - sel.tileSheetBounds.x
          const sy = r.y - sel.tileSheetBounds.y

          if (mode === BlendMode.OVERWRITE) {
            ctx.clearRect(drawX, drawY, g.w, g.h)
          }

          putImageDataScaled(
            ctx,
            composed,
            drawX,
            drawY,
            blendMode,
            sx,
            sy,
            g.w,
            g.h,
          )
        }
      }
    }
    ,
    gridScreenOverlayDraw({ state, tilesetToolState }, ctx) {
      const sel = tilesetToolState.selection
      if (!sel) return

      const { scale } = state
      if (!sel.gridBounds || !sel.initialGridBounds) return

      ctx.strokeStyle = 'cyan'
      ctx.lineWidth = 1

      // GRID-SPACE delta
      const dx = sel.gridBounds.x - sel.initialGridBounds.x
      const dy = sel.gridBounds.y - sel.initialGridBounds.y

      // Convert GRID → SCREEN for drawing
      for (const g of tilesetToolState.selectionGridSpaceMergedRects()) {
        const screenX = (g.x + dx) * scale
        const screenY = (g.y + dy) * scale
        const screenW = g.w * scale
        const screenH = g.h * scale

        ctx.strokeRect(
          screenX - 0.5,
          screenY - 0.5,
          screenW + 1,
          screenH + 1,
        )
      }
    }
    ,
    tilePixelOverlayDraw({ state, tilesetToolState }, ctx, tileId) {
      const sel = tilesetToolState.selection
      if (!sel) return

      const { tileSheet } = state
      const composed = sel.toPixels(tileSheet)

      const mode = toolContext.selectMoveBlendMode
      const blendMode = selectMoveBlendModeToBlendFn[mode]

      // 1. Clear original selection footprint on this tile (if moved)
      if (sel.hasMoved) {
        for (const r of sel.originalRects) {
          if (r.tileId !== tileId) continue
          const { x: localX, y: localY } = tileSheet.sheetToTileLocal(tileId, r.x, r.y)

          ctx.clearRect(localX, localY, r.w, r.h)
        }
      }

      // 2. Draw current selection footprint on this tile
      for (const r of sel.currentRects) {
        if (r.tileId !== tileId) continue
        const { x: localX, y: localY } = tileSheet.sheetToTileLocal(tileId, r.x, r.y)
        const { srcX, srcY, w, h } = r

        if (mode === BlendMode.OVERWRITE) {
          ctx.clearRect(localX, localY, w, h)
        }

        putImageDataScaled(
          ctx,
          composed,
          localX,
          localY,
          blendMode,
          srcX,
          srcY,
          w,
          h,
        )
      }
    },
    tileScreenOverlayDraw({ state, tilesetToolState }, ctx, tileId) {
      const sel = tilesetToolState.selection
      if (!sel) return

      const { tileSheet, scale } = state

      ctx.strokeStyle = 'cyan'
      ctx.lineWidth = 1

      for (const r of sel.currentRects) {
        if (r.tileId !== tileId) continue

        const { x: localX, y: localY } =
          tileSheet.sheetToTileLocal(tileId, r.x, r.y)

        const { w, h } = r

        const screenX = localX * scale - 0.5
        const screenY = localY * scale - 0.5
        const screenW = w * scale + 1
        const screenH = h * scale + 1

        ctx.strokeRect(screenX, screenY, screenW, screenH)
      }
    },
  }
}

const selectMoveBlendModeToBlendFn: Record<BlendMode, BlendFn | undefined> = {
  [BlendMode.OVERWRITE]: undefined,
  [BlendMode.IGNORE_TRANSPARENT]: blendIgnoreTransparent,
  [BlendMode.IGNORE_SOLID]: blendSourceAlphaOver(0.5),
}
