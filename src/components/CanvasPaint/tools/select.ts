import type { RectBounds } from '../../../lib/util/data/Bounds.ts'
import { type BlendFn, blendIgnoreTransparent, blendSourceAlphaOver } from '../../../lib/util/html-dom/blit.ts'
import { putImageDataScaled } from '../../../lib/util/html-dom/ImageData.ts'
import type { LocalToolContext, ToolHandler } from '../_canvas-editor-types.ts'
import { BlendMode, CanvasType, Tool } from '../_canvas-editor-types.ts'
import type { GlobalToolContext } from '../GlobalToolManager.ts'
import type { SelectionLocalToolState } from '../SelectionLocalToolState.ts'

export type SelectToolHandler<T = SelectionLocalToolState> = ToolHandler<T> & {
  onModeChanged?: (local: LocalToolContext<T>, newMode: SelectionMode) => void,
}

export function makeSelectTool(toolContext: GlobalToolContext): SelectToolHandler {

  return {
    onGlobalToolChanging({ toolState }, oldTool, _newTool) {
      if (oldTool === Tool.SELECT && toolState.selection) {
        // optional: commit on tool change
      }
    },

    // onDeselect({ gridRenderer, toolState, tileSheetWriter }) {
    //   const ts = toolState
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
    onModeChanged({ toolState }) {
      toolState.draw()
    },
    onClick({ state, toolState, gridRenderer, tileSheetWriter }, x, y, canvasType, tileId) {
      const ts = toolState
      const sel = ts.selection
      if (!sel) return

      if (canvasType === CanvasType.GRID) {
        if (!ts.gridPointInSelection(x, y)) {
          console.log({ LOG_NAME: 'onClick.GRID.outsideSelection' })

          if (ts.selectionHasMoved()) {
            console.log({ LOG_NAME: 'onClick.GRID.selectionHasMoved' })
            ts.commit(toolContext.selectMoveBlendMode)
          } else {
            console.log({ LOG_NAME: 'onClick.GRID.selectionNotMoved' })
            ts.clearSelection()
            gridRenderer.queueRenderGrid()
          }
        } else {
          console.log({ LOG_NAME: 'onClick.GRID.insideSelection' })
        }
      } else {
        console.log({ LOG_NAME: 'onClick.TILE' })
        if (!ts.tilePointInSelection(tileId!, x, y)) {
          console.log({ LOG_NAME: 'onClick.TILE.outsideSelection' })
          ts.commit(toolContext.selectMoveBlendMode)
        } else {
          console.log({ LOG_NAME: 'onClick.TILE.insideSelection' })
        }
        gridRenderer.queueRenderGrid()
      }
    },
    onDragStart({ state, toolState, gridRenderer }, x, y, canvasType, tileId) {
      const ts = toolState
      const sel = ts.selection

      if (canvasType === CanvasType.GRID) {
        if (!sel) {
          console.log({ LOG_NAME: 'onDragStart.GRID.noSelection' })
          ts.gridStartSelection(x, y)
          return
        }

        if (ts.gridPointInSelection(x, y)) {
          console.log({ LOG_NAME: 'onDragStart.GRID.dragExistingSelection' })
          ts.gridDragStart(x, y)
          return
        }

        console.log({ LOG_NAME: 'onDragStart.GRID.newSelection' })
        ts.gridStartSelection(x, y)
        gridRenderer.queueRenderAll()
      } else {
        if(!tileId) throw new Error('tileId required')
        console.log({ LOG_NAME: 'onDragStart.TILE' })
        if (!sel) {
          console.log({ LOG_NAME: 'onDragStart.TILE.noSelection' })
          ts.tileStartSelection(tileId, x, y)
          return
        }
        if (ts.tilePointInSelection(tileId, x, y)) {
          console.log('dragstart tile')
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

      if (!sel.gridBounds || !sel.initialGridBounds) return

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

          const sx = r.bufferX
          const sy = r.bufferY

          if (mode === BlendMode.OVERWRITE) {
            ctx.clearRect(drawX, drawY, r.w, r.h)
          }
          putImageDataScaled(
            ctx,
            sel.pixels,
            drawX,
            drawY,
            blendMode,
            sx,
            sy,
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
        if (!sel.gridBounds || !sel.initialGridBounds) return
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

        let bufferX: number
        let bufferY: number

        if (toolState.isTileSelection) {
          bufferX = r.x - sel.tileSheetBounds.x
          bufferY = r.y - sel.tileSheetBounds.y
        } else {
          bufferX = r.bufferX
          bufferY = r.bufferY
        }

        putImageDataScaled(
          ctx,
          composed,
          localX,
          localY,
          blendMode,
          bufferX,
          bufferY,
          r.w,
          r.h,
        )
      }
    },
    tileScreenOverlayDraw({ state, toolState }, ctx, tileId) {
      const sel = toolState.selection
      const { tileSheet, scale } = state
      if (sel) {
        console.log('selection')
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

const selectMoveBlendModeToBlendFn: Record<BlendMode, BlendFn | undefined> = {
  [BlendMode.OVERWRITE]: undefined,
  [BlendMode.IGNORE_TRANSPARENT]: blendIgnoreTransparent,
  [BlendMode.IGNORE_SOLID]: blendSourceAlphaOver(0.5),
}

function drawSelectOutline(ctx: CanvasRenderingContext2D, scale: number, rect: RectBounds) {
  const { x, y, w, h } = rect
  ctx.strokeStyle = 'cyan'
  ctx.lineWidth = 1
  ctx.strokeRect(
    x * scale - 0.5,
    y * scale - 0.5,
    w * scale + 1,
    h * scale + 1,
  )
}