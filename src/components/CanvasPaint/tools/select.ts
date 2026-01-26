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
          ts.moveSelection(x, y)               // grid-pixel
        } else if (ts.selecting) {
          ts.updateSelection(x, y)             // grid-pixel
        }
        gridRenderer.queueRenderAll()
      } else {
        // x,y are TILE-LOCAL here
        const { x: px, y: py } = state.tileSheet.tileLocalToSheet(tileId!, x, y)

        if (ts.dragging) {
          ts.moveSelection(px, py)             // moving selection: SHEET coords
        } else if (ts.selecting) {
          ts.updateSelection(x, y)             // <-- TILE-LOCAL for selection
        }
        gridRenderer.queueRenderTile(tileId!)
        gridRenderer.queueRenderGrid()
      }
    },
    onDragEnd({ state, tilesetToolState, gridRenderer }, _x, _y, canvasType, tileId) {
      const ts = tilesetToolState
      console.log('onDragEnd', ts.selection)
      if (ts.selecting) {
        ts.finalizeSelection()
      }

      const sel = ts.selection
      if (!sel) return

      if (canvasType === CanvasType.GRID) {
        gridRenderer.queueRenderAll()
      } else {
        gridRenderer.queueRenderTile(tileId!)
        gridRenderer.queueRenderGrid()
      }
    },
    gridPixelOverlayDraw({ state, tilesetToolState }, ctx) {
      const sel = tilesetToolState.selection
      if (!sel) return

      const { tileGridManager, tileSheet } = state
      const composed = sel.toPixels(tileSheet)
      const mode = toolContext.selectMoveBlendMode
      const blendMode = selectMoveBlendModeToBlendFn[mode]

      // Clear original if moved
      if (sel.hasMoved) {
        for (const r of sel.originalRects) {
          const proj = tileGridManager.projectTileSheetRect(r)
          for (const p of proj) {
            for (const g of p.gridRects) {
              ctx.clearRect(g.x, g.y, g.w, g.h)
            }
          }
        }
      }

      // Draw current rects
      for (const r of sel.currentRects) {
        const proj = tileGridManager.projectTileSheetRect(r)

        for (const p of proj) {
          const { gridRects, gridOverlap } = p
          const { x: sx, y: sy, w, h } = gridOverlap

          for (const g of gridRects) {
            if (mode === BlendMode.OVERWRITE) {
              ctx.fillStyle = '#ff0000'
              ctx.fillRect(g.x, g.y, g.w, g.h)
            }

            putImageDataScaled(
              ctx,
              composed,
              g.x,
              g.y,
              blendMode,
              sx,
              sy,
              w,
              h,
            )
          }
        }
      }
    },
    gridScreenOverlayDraw({ state, tilesetToolState }, ctx) {
      const sel = tilesetToolState.selection
      console.log('gridScreenOverlayDraw selection', sel)
      if (!sel) return

      const { scale, tileGridManager } = state

      ctx.strokeStyle = 'cyan'
      ctx.lineWidth = 1

      console.log('sel.currentRects', sel.currentRects)
      // Draw the outline for each projected grid rect
      for (const r of sel.currentRects) {
        const proj = tileGridManager.projectTileSheetRect(r)

        for (const p of proj) {
          for (const g of p.gridRects) {
            const screenX = g.x * scale - 0.5
            const screenY = g.y * scale - 0.5
            const screenW = g.w * scale + 1
            const screenH = g.h * scale + 1

            console.log({ screenX, screenY, screenW, screenH })
            ctx.strokeRect(screenX, screenY, screenW, screenH)
          }
        }
      }
    },
    tilePixelOverlayDraw({ state, tilesetToolState }, ctx, tileId) {
      const sel = tilesetToolState.selection
      if (!sel) return

      const { tileGridManager, tileSheet } = state
      const composed = sel.toPixels(tileSheet)

      const mode = toolContext.selectMoveBlendMode
      const blendMode = selectMoveBlendModeToBlendFn[mode]

      //
      // 1. Clear original selection footprint on this tile (if moved)
      //
      if (sel.hasMoved) {
        for (const r of sel.originalRects) {
          const proj = tileGridManager.projectTileSheetRect(r)
          const hit = proj.find(p => p.tile.id === tileId)
          if (hit) {
            const { x, y, w, h } = hit.tileOverlap
            ctx.clearRect(x, y, w, h)
          }
        }
      }

      //
      // 2. Draw current selection footprint on this tile
      //
      for (const r of sel.currentRects) {
        const proj = tileGridManager.projectTileSheetRect(r)
        const hit = proj.find(p => p.tile.id === tileId)
        if (!hit) continue

        const { tileRelativeOffset, tileOverlap } = hit
        const { x: dx, y: dy } = tileRelativeOffset
        const { x: sx, y: sy, w, h } = tileOverlap

        if (mode === BlendMode.OVERWRITE) {
          ctx.fillStyle = '#ff0000'
          ctx.fillRect(dx, dy, w, h)
        }

        putImageDataScaled(
          ctx,
          composed,
          dx,
          dy,
          blendMode,
          sx,
          sy,
          w,
          h,
        )
      }
    },
    tileScreenOverlayDraw({ state, tilesetToolState }, ctx, tileId) {
      const sel = tilesetToolState.selection
      if (!sel) return

      const { tileGridManager, scale } = state

      ctx.strokeStyle = 'cyan'
      ctx.lineWidth = 1

      for (const r of sel.currentRects) {
        const proj = tileGridManager.projectTileSheetRect(r)
        const hit = proj.find(p => p.tile.id === tileId)
        if (!hit) continue

        const { tileRelativeOffset, tileOverlap } = hit
        const { x, y } = tileRelativeOffset
        const { w, h } = tileOverlap

        ctx.strokeRect(
          x * scale - 0.5,
          y * scale - 0.5,
          w * scale + 1,
          h * scale + 1,
        )
      }
    },
  }
}

const selectMoveBlendModeToBlendFn: Record<BlendMode, BlendFn | undefined> = {
  [BlendMode.OVERWRITE]: undefined,
  [BlendMode.IGNORE_TRANSPARENT]: blendIgnoreTransparent,
  [BlendMode.IGNORE_SOLID]: blendSourceAlphaOver(0.5),
}
