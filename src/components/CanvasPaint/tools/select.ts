import { type BlendFn, blendIgnoreTransparent, blendSourceAlphaOver } from '../../../lib/util/html-dom/blit.ts'
import { putImageDataScaled } from '../../../lib/util/html-dom/ImageData.ts'
import type { ToolHandler } from '../_canvas-editor-types.ts'
import { BlendMode, CanvasType, Tool } from '../_canvas-editor-types.ts'
import type { GlobalToolContext } from '../GlobalToolManager.ts'

export function makeSelectTool(toolContext: GlobalToolContext): ToolHandler {

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
        // commit(tilesetToolState, gridRenderer, tileSheetWriter)
      }
    },
    onDeselect({ gridRenderer, tilesetToolState, tileSheetWriter }) {
      const ts = tilesetToolState
      const pixels = ts.selection?.pixels
      if (!pixels) return

      const affectedTileIds = tileSheetWriter.blendGridImageData(pixels, ts.selection.x!, ts.selection.y!, toolContext.selectMoveBlendMode)

      gridRenderer.queueRenderTiles(affectedTileIds)
      gridRenderer.queueRenderGrid()
    },
    onClick({ state, tilesetToolState, gridRenderer, tileSheetWriter }, x, y, canvasType, tileId) {
      const ts = tilesetToolState
      const sel = ts.selection
      if (!sel) return
      if (canvasType === CanvasType.GRID) {
        if (!ts.inSelection(x, y)) {
          ts.commitGrid(toolContext.selectMoveBlendMode)
        }
      } else {
        const { x: px, y: py } = state.tileSheet.tileLocalToSheet(tileId!, x, y)
        if (!ts.inSelection(px, py)) {
          ts.commitTile(tileId!, toolContext.selectMoveBlendMode)
        }
      }
    },
    onDragStart({ state, tilesetToolState, gridRenderer }, x, y, canvasType, tileId) {
      const ts = tilesetToolState
      const sel = ts.selection
      if (canvasType === CanvasType.GRID) {
        if (!sel) {
          ts.startSelection(x, y)
          return
        }

        if (ts.inSelection(x, y)) {
          ts.dragStart(x, y)
          return
        }

        ts.startSelection(x, y)
        gridRenderer.queueRenderAll()
      } else {
        const { x: px, y: py } = state.tileSheet.tileLocalToSheet(tileId!, x, y)

        if (!sel) {
          ts.startSelection(px, py)
          return
        }

        if (ts.inSelection(px, py)) {
          ts.dragStart(px, py)
          return
        }
        ts.startSelection(px, py)
        gridRenderer.queueRenderTile(tileId!)
        gridRenderer.queueRenderGrid()
      }
    },
    onDragMove({ state, tilesetToolState, gridRenderer }, x, y, canvasType, tileId) {
      const ts = tilesetToolState
      const sel = ts.selection
      if (!sel) return
      if (canvasType === CanvasType.GRID) {
        if (ts.dragging) {
          ts.moveSelection(x, y)
        } else if (ts.selecting) {
          ts.updateSelection(x, y)
        }
        gridRenderer.queueRenderAll()
      } else {
        const { x: px, y: py } = state.tileSheet.tileLocalToSheet(tileId!, x, y)
        if (ts.dragging) {
          ts.moveSelection(px, py)
        } else if (ts.selecting) {
          ts.updateSelection(px, py)
        }
        gridRenderer.queueRenderTile(tileId!)
      }
    },
    onDragEnd({ state, tilesetToolState, gridRenderer }, _x, _y, canvasType, tileId) {
      const ts = tilesetToolState
      const sel = ts.selection
      if (!sel) return
      if (canvasType === CanvasType.GRID) {
        if (ts.selecting) {
          ts.extractSelectionPixels(gridRenderer.tileGridImageDataRef.get()!)
          ts.selecting = false
        }
        ts.dragging = false
        gridRenderer.queueRenderAll()
      } else {
        if (ts.selecting) {
          ts.extractSelectionPixels(state.tileSheet.extractTile(tileId!))
          ts.selecting = false
        }
        ts.dragging = false
        gridRenderer.queueRenderTile(tileId!)
      }
    },
    gridPixelOverlayDraw({ state, tilesetToolState }, ctx) {
      const ts = tilesetToolState
      const sel = ts.selection
      if (!sel || !sel.pixels) return

      const { tileSize, tileGridManager, tileGrid } = state
      const mode = toolContext.selectMoveBlendMode
      const blendMode = selectMoveBlendModeToBlendFn[mode]

      // 1) If the selection moved, clear the ORIGINAL area across all instances
      if (ts.selectionHasMoved()) {
        const origRect = ts.originalRect()

        const origOverlaps = tileGridManager.getOverlappingTiles(origRect)

        for (const o of origOverlaps) {
          const tileId = o.tile.id

          tileGrid.eachWithTileId(tileId, (tileX, tileY) => {
            const { x: clipX, y: clipY, w: clipW, h: clipH } = o.tileOverlap

            const clearX = tileX * tileSize + clipX
            const clearY = tileY * tileSize + clipY

            ctx.clearRect(clearX, clearY, clipW, clipH)
          })
        }
      }

      // 2) Draw the moved selection at its NEW position over all instances
      const selOverlaps = tileGridManager.getOverlappingTiles(sel)

      for (const o of selOverlaps) {
        const tileId = o.tile.id

        tileGrid.eachWithTileId(tileId, (tileX, tileY) => {
          // tile pixel coords
          const { x: localX, y: localY } = o.tileRelativeOffset

          // grid pixel coords
          const px = tileX * tileSize + localX
          const py = tileY * tileSize + localY

          if (mode === BlendMode.OVERWRITE) {
            ctx.clearRect(px, py, o.tileOverlap.w, o.tileOverlap.h)
          }

          putImageDataScaled(
            ctx,
            sel.pixels!,
            px,
            py,
            blendMode,
          )
        })
      }
    },
    gridScreenOverlayDraw({ state, tilesetToolState }, ctx) {
      const sel = tilesetToolState.selection
      if (!sel) return

      const { scale, tileSize, tileGridManager, tileGrid } = state

      ctx.strokeStyle = 'cyan'
      ctx.lineWidth = 1

      const overlaps = tileGridManager.getOverlappingTiles(sel)

      for (const o of overlaps) {
        const tileId = o.tile.id

        tileGrid.eachWithTileId(tileId, (gx, gy) => {
          // Compute the selection offset relative to this tile
          const localX = sel.x - o.tileX * tileSize
          const localY = sel.y - o.tileY * tileSize

          const screenX = (gx * tileSize + localX) * scale - 0.5
          const screenY = (gy * tileSize + localY) * scale - 0.5

          const screenW = sel.w * scale + 1
          const screenH = sel.h * scale + 1

          ctx.strokeRect(screenX, screenY, screenW, screenH)
        })
      }
    },
    tilePixelOverlayDraw({ state, tilesetToolState }, ctx, tileId) {
      const ts = tilesetToolState
      const sel = ts.selection
      if (!sel) return

      if (!sel.pixels) return

      const { tileGridManager } = state
      // clear original
      if (ts.selectionHasMoved()) {
        const origOverlaps = tileGridManager.getOverlappingTiles(ts.originalRect())
        const origHit = origOverlaps.find(o => o.tile.id === tileId)
        if (origHit) {
          const { x: ox, y: oy, w: ow, h: oh } = origHit.tileOverlap
          ctx.clearRect(ox, oy, ow, oh)
        }
      }

      const overlaps = tileGridManager.getOverlappingTiles(sel)
      const hit = overlaps.find(o => o.tile.id === tileId)
      if (!hit) return

      const { tileOverlap, gridOverlap } = hit

      // ⭐ Recover true tile-local offset (may be negative)
      const tx = tileOverlap.x - gridOverlap.x
      const ty = tileOverlap.y - gridOverlap.y

      const mode = toolContext.selectMoveBlendMode
      const blendMode = selectMoveBlendModeToBlendFn[mode]

      if (mode === BlendMode.OVERWRITE) {
        ctx.clearRect(tx, ty, sel.w, sel.h)
      }

      putImageDataScaled(
        ctx,
        sel.pixels,
        tx,
        ty,
        blendMode,
      )
    },
    tileScreenOverlayDraw({ state, tilesetToolState }, ctx, tileId) {
      const sel = tilesetToolState.selection
      if (!sel) return

      const { tileSize, tileGridManager, scale } = state

      // Find all tiles overlapped by the selection
      const overlaps = tileGridManager.getOverlappingTiles(sel)

      // Find the overlap for THIS tile
      const o = overlaps.find(o => o.tile.id === tileId)
      if (!o) return

      // Tile-local offset of the selection rect
      const localX = sel.x - o.tileX * tileSize
      const localY = sel.y - o.tileY * tileSize

      ctx.strokeStyle = 'cyan'
      ctx.lineWidth = 1

      ctx.strokeRect(
        localX * scale - 0.5,
        localY * scale - 0.5,
        sel.w * scale + 1,
        sel.h * scale + 1,
      )
    },
  }
}

const selectMoveBlendModeToBlendFn: Record<BlendMode, BlendFn | undefined> = {
  [BlendMode.OVERWRITE]: undefined,
  [BlendMode.IGNORE_TRANSPARENT]: blendIgnoreTransparent,
  [BlendMode.IGNORE_SOLID]: blendSourceAlphaOver(0.5),
}