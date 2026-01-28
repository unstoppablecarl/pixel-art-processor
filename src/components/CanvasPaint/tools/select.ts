import { type BlendFn, blendIgnoreTransparent, blendSourceAlphaOver } from '../../../lib/util/html-dom/blit.ts'
import { putImageDataScaled } from '../../../lib/util/html-dom/ImageData.ts'
import { getCanvasPixelContext } from '../../../lib/util/html-dom/PixelCanvas.ts'
import type { ToolHandler } from '../_canvas-editor-types.ts'
import { BlendMode, CanvasType, Tool } from '../_canvas-editor-types.ts'
import type { GlobalToolContext } from '../GlobalToolManager.ts'
import { mergeRectBounds, type TileSheetSelection } from '../lib/TileSheetSelection.ts'

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
        const { x: px, y: py } = state.tileSheet.tileLocalToSheet(tileId!, x, y)
        if (!ts.tileInSelection(tileId!, px, py)) {
          console.log({ LOG_NAME: 'onClick.TILE.outsideSelection' })
          ts.commit(toolContext.selectMoveBlendMode)
        } else {
          console.log({ LOG_NAME: 'onClick.TILE.insideSelection' })
        }
        gridRenderer.queueRenderGrid()
      }
    },

    onDragStart({ state, tilesetToolState, gridRenderer }, x, y, canvasType, tileId) {
      const ts = tilesetToolState
      const sel = ts.selection

      if (canvasType === CanvasType.GRID) {
        if (!sel) {
          console.log({ LOG_NAME: 'onDragStart.GRID.noSelection' })
          ts.gridStartSelection(x, y)
          return
        }

        if (ts.gridInSelection(x, y)) {
          console.log({ LOG_NAME: 'onDragStart.GRID.dragExistingSelection' })
          ts.dragStart(x, y)
          return
        }

        console.log({ LOG_NAME: 'onDragStart.GRID.newSelection' })
        ts.gridStartSelection(x, y)
        gridRenderer.queueRenderAll()
      } else {
        console.log({ LOG_NAME: 'onDragStart.TILE' })
        if (!sel) {
          console.log({ LOG_NAME: 'onDragStart.TILE.noSelection' })
          ts.tileStartSelection(tileId!, x, y)
          return
        }
        const { x: px, y: py } = state.tileSheet.tileLocalToSheet(tileId!, x, y)

        if (ts.tileInSelection(tileId!, px, py)) {
          console.log({ LOG_NAME: 'onDragStart.TILE.dragExistingSelection' })
          ts.dragStart(px, py)
          return
        }

        console.log({ LOG_NAME: 'onDragStart.TILE.newSelection' })
        ts.tileStartSelection(tileId!, x, y)
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

      if (ts.selecting) {
        ts.finalizeSelection()
      }

      if (ts.dragging) {
        ts.dragEnd()
      }
      gridRenderer.queueRenderAll()
    },
    gridPixelOverlayDraw({ state, tilesetToolState }, ctx) {
      const sel = tilesetToolState.selection
      if (!sel) return

      const { tileGridManager } = state
      const mode = toolContext.selectMoveBlendMode
      const blendMode = selectMoveBlendModeToBlendFn[mode]

      if (!sel.gridBounds || !sel.initialGridBounds) return

      // 1. Clear original footprint (GRID SPACE)
      if (sel.hasMoved) {
        for (const r of sel.currentRects) {
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

      // drawCommitBounds(ctx, state, sel)
    }
    ,
    tilePixelOverlayDraw({ state, tilesetToolState }, ctx, tileId) {
      const sel = tilesetToolState.selection
      if (!sel) return

      const { tileSheet } = state
      const composed = sel.pixels

      const mode = toolContext.selectMoveBlendMode
      const blendMode = selectMoveBlendModeToBlendFn[mode]

      // 1. Clear original selection footprint on this tile (if moved)
      if (sel.hasMoved) {
        for (const r of sel.originalRects) {
          if (r.tileId !== tileId) continue

          const { x: localX, y: localY } =
            tileSheet.sheetToTileLocal(tileId, r.x, r.y)

          putImageDataScaled(ctx, composed, localX, localY, blendMode)

          ctx.clearRect(localX, localY, r.w, r.h)
        }
      }

      //
      // 2. Draw current selection footprint on this tile
      //
      for (const r of sel.currentRects) {
        if (r.tileId !== tileId) continue

        // tile-local position where this rect should be drawn
        const { x: localX, y: localY } =
          tileSheet.sheetToTileLocal(tileId, r.x, r.y)

        // buffer-local offset inside the composed ImageData
        const dstX = r.x - sel.tileSheetBounds.x
        const dstY = r.y - sel.tileSheetBounds.y

        if (mode === BlendMode.OVERWRITE) {
          ctx.clearRect(localX, localY, r.w, r.h)
        }
        // debugDrawSelection(sel, composed)
        putImageDataScaled(
          ctx,
          composed,
          localX,
          localY,
          blendMode,
          dstX,
          dstY,
          r.w,
          r.h,
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

function debugDrawSelection(sel: TileSheetSelection, composed: ImageData) {
  const debugCanvas = document.getElementById('debug-canvas') as HTMLCanvasElement
  const text1 = document.getElementById('text1') as HTMLElement
  const text2 = document.getElementById('text2') as HTMLElement
  // const text3 = document.getElementById('text3') as HTMLElement

  debugCanvas.width = 512
  debugCanvas.height = 512
  const ctx = getCanvasPixelContext(debugCanvas)

  ctx.clearRect(0, 0, debugCanvas.width, debugCanvas.height)

  // Draw the composed buffer at (0,0)
  ctx.putImageData(composed, 0, 0)

  // Draw bounds box
  ctx.strokeStyle = 'red'
  ctx.lineWidth = 1
  ctx.strokeRect(0, 0, composed.width, composed.height)

  text1.innerHTML = [
    `tileSheet bounds: x=${sel.tileSheetBounds.x}, y=${sel.tileSheetBounds.y}`,
    `buffer: ${composed.width}x${composed.height}`,
  ].join('<br/>')

  const igb = sel.initialGridBounds!

  sel.currentRects.forEach((r) => {
    // const rx = r.x - sel.gridBounds!.x
    // const ry = r.y - sel.gridBounds!.y

    const srcX = r.gridX! - igb.x
    const srcY = r.gridY! - igb.y

    ctx.strokeStyle = 'yellow'
    ctx.strokeRect(srcX, srcY, r.w, r.h)

    // ctx.strokeRect(r.x, r.y, r.w, r.h)
  })

  if (sel.gridBounds !== null) {

    // text2.innerHTML = sel.currentRects.map((r) => {
    //   const rx = r.x - sel.gridBounds!.x
    //   const ry = r.y - sel.gridBounds!.y
    //   ctx.strokeRect(rx, ry, r.w, r.h)
    //   return `r.x=${r.x}, r.y=${r.y}`
    // }).join('<br/>')
  }

  // text3.innerHTML = Object.entries(sel).map(([key, val]) => {
  //   return `${key}: ${val}`
  // }).join('<br/>')
}
