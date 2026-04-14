import type { CanvasEditToolStore } from '../../../lib/store/canvas-edit-tool-store.ts'
import { type BaseToolHandler } from '../../_core/_core-editor-types.ts'
import { useBrushCursor } from '../../_core/data/Brush.ts'
import {
  type TileGridEditorToolContext,
  type TileGridEditorToolHandlerArgs,
  type TileGridEditorToolHandlerRender,
} from '../_tile-grid-editor-types.ts'
import { makeTileGridBrushToolState, type TileGridBrushToolState } from './states/TileGridBrushToolState.ts'

export type TileGridBrushToolHandler =
  & BaseToolHandler<TileGridBrushToolState, TileGridEditorToolHandlerArgs>
  & TileGridEditorToolHandlerRender

export function makeTileGridBrushTool(
  {
    state,
    gridRenderer,
    tileSheetWriter,
  }: TileGridEditorToolContext,
  store: CanvasEditToolStore,
): TileGridBrushToolHandler {

  const toolState = makeTileGridBrushToolState({ state, gridRenderer, tileSheetWriter, store })
  let isDrawing = false
  const cursor = useBrushCursor()

  return {
    toolState,
    onMouseDown: (x, y, canvasType, tileId) => {
      isDrawing = true
      toolState.writeBrush(x, y, canvasType, tileId)
    },
    onDragStart(x, y, canvasType, tileId) {
      isDrawing = true
      toolState.writeBrush(x, y, canvasType, tileId)
    },
    onDragMove(x, y, canvasType, tileId) {
      if (!isDrawing) return
      const { mouseLastX, mouseLastY } = state
      if (mouseLastX == null || mouseLastY == null) return

      toolState.strokeBrush(x, y, mouseLastX, mouseLastY, canvasType, tileId)
    },
    onDragEnd() {
      isDrawing = false
      toolState.commit()
    },
    onClick() {
      toolState.commit()
    },
    onMouseMove(x, y): void {
      // always draw cursor
      gridRenderer.queueRenderTiles()
      gridRenderer.queueRenderGrid()
    },
    onMouseLeave(canvasType, tileId) {
      gridRenderer.queueRenderAll()
    },
    gridPixelOverlayDraw(ctx) {
      toolState.drawGrid(ctx)
    },
    gridScreenOverlayDraw(ctx) {
      if (state.hoverTileId === null) return
      const { tileGrid, tileSize } = state
      const x = state.hoverTilePixelX
      const y = state.hoverTilePixelY

      tileGrid.eachWithTileId(state.hoverTileId, (gTileX, gTileY, v) => {
        const screenX = (gTileX * tileSize + x!)
        const screenY = (gTileY * tileSize + y!)

        cursor.draw(ctx, screenX, screenY)
      })
    },
    tilePixelOverlayDraw(ctx, tileId) {
      toolState.drawTile(ctx, tileId)
    },
    tileScreenOverlayDraw(ctx, tileId) {
      if (state.mouseGridX && state.mouseGridY) {
        const bounds = cursor.getBounds(state.mouseGridX, state.mouseGridY)
        const overlapping = state.tileGridGeometry.getOverlappingTilesOnGrid(bounds)

        for (const r of overlapping) {
          if (r.tile.id !== tileId) continue

          const rx = r.tileRelativeOffsetX
          const ry = r.tileRelativeOffsetY

          cursor.drawRaw(
            ctx,
            rx - 1.5,
            ry - 1.5,
          )
        }
        return
      }

      if (tileId !== state.hoverTileId) return
      const x = state.hoverTilePixelX
      const y = state.hoverTilePixelY
      if (x == null || y == null) return

      cursor.draw(ctx, x, y)
    },
  }
}
