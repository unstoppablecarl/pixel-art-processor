import type { Point } from '../../../../lib/node-data-types/BaseDataStructure.ts'
import type { CanvasEditToolStore } from '../../../../lib/store/canvas-edit-tool-store.ts'
import { interpolateLine } from '../../../../lib/util/data/Grid.ts'
import type { TileId } from '../../../../lib/wang-tiles/WangTileset.ts'
import { type BaseBlendModeToolHandler, TOOL_HOVER_CSS_CLASSES } from '../../_core-editor-types.ts'
import { useBrushCursor } from '../../_support/renderers/BrushCursor.ts'
import type { BrushToolState } from '../../_support/tools/BrushToolState.ts'
import {
  CanvasType,
  type LocalToolContext,
  type TileGridEditorToolHandlerArgs,
  type TileGridEditorToolHandlerRender,
} from '../_tile-grid-editor-types.ts'

export type TileGridBrushToolHandler<L = LocalToolContext<BrushToolState>> =
  BaseBlendModeToolHandler<L, TileGridEditorToolHandlerArgs>
  & TileGridEditorToolHandlerRender<L>

export function makeBrushTool(store: CanvasEditToolStore): TileGridBrushToolHandler {
  let isDrawing = false
  const cursor = useBrushCursor()

  function getGridBrushPixels(
    ctx: LocalToolContext<BrushToolState>,
    x: number,
    y: number,
  ): Point[] {
    const { state, toolState } = ctx
    const { gridPixelWidth: width, gridPixelHeight: height } = state
    return toolState.getBrushPixels(x, y, width, height)
  }

  function getTileBrushPixels(
    c: LocalToolContext<BrushToolState>,
    x: number,
    y: number,
  ): Point[] {
    const { state, toolState } = c
    const { tileSize } = state
    return toolState.getBrushPixels(x, y, tileSize, tileSize)
  }

  function writeBrushAt(
    c: LocalToolContext<BrushToolState>,
    x: number,
    y: number,
    canvasType: CanvasType,
    tileId?: TileId,
  ) {
    const { tileSheetWriter } = c
    if (canvasType === CanvasType.GRID) {
      tileSheetWriter.withHistory((mutator) => {
        const pixels = getGridBrushPixels(c, x, y)
        mutator.writeGridPoints(pixels, store.brushColor)
      })

    } else {
      tileSheetWriter.withHistory((mutator) => {
        const tilePixels = getTileBrushPixels(c, x, y)
        mutator.writeTilePoints(tileId!, tilePixels, store.brushColor)
      })
    }
  }

  return {
    cursorCssClass: TOOL_HOVER_CSS_CLASSES.BRUSH,
    onMouseDown: (c, x, y, canvasType, tileId) => {
      isDrawing = true
      writeBrushAt(c, x, y, canvasType, tileId)
    },
    onDragStart(c, x, y, canvasType, tileId) {
      isDrawing = true
      writeBrushAt(c, x, y, canvasType, tileId)
    },
    onDragMove(c, x, y, canvasType, tileId) {
      const { state, tileSheetWriter, gridRenderer } = c
      if (!isDrawing) return
      const { mouseLastX, mouseLastY } = state
      if (mouseLastX == null || mouseLastY == null) return

      // Interpolate between last position and current position
      const points = interpolateLine(
        Math.floor(mouseLastX!),
        Math.floor(mouseLastY!),
        Math.floor(x),
        Math.floor(y),
      )

      if (canvasType === CanvasType.GRID) {
        let pixels: Point[] = []
        for (const p of points) {
          pixels.push(...getGridBrushPixels(c, p.x, p.y))
        }
        tileSheetWriter.withHistory((mutator) => {
          mutator.writeGridPoints(pixels, store.brushColor)
        })
      }

      if (canvasType === CanvasType.TILE) {
        let pixels: Point[] = []
        for (const p of points) {
          pixels.push(...getTileBrushPixels(c, p.x, p.y))
        }
        tileSheetWriter.withHistory((mutator) => {
          mutator.writeTilePoints(tileId!, pixels, store.brushColor)
        })
      }
      gridRenderer.queueRenderTiles()
    },
    onDragEnd() {
      isDrawing = false
    },
    onMouseMove({ gridRenderer }, x, y): void {
      // always draw cursor
      gridRenderer.queueRenderTiles()
      gridRenderer.queueRenderGrid()
    },
    onMouseLeave({ gridRenderer }, canvasType, tileId) {
      gridRenderer.queueRenderAll()
    },
    gridScreenOverlayDraw({ state, toolState }, ctx: CanvasRenderingContext2D) {
      if (state.hoverTileId === null) return
      const { scale, tileGrid, tileSize } = state
      const x = state.hoverTilePixelX
      const y = state.hoverTilePixelY

      tileGrid.eachWithTileId(state.hoverTileId, (gTileX, gTileY, v) => {
        const screenX = (gTileX * tileSize + x!)
        const screenY = (gTileY * tileSize + y!)

        cursor.draw(ctx, screenX, screenY, scale)
      })
    },
    tileScreenOverlayDraw({ state, toolState }, ctx, tileId) {
      if (state.mouseGridX && state.mouseGridY) {

        const { scale } = state
        const bounds = cursor.getBounds(state.mouseGridX, state.mouseGridY)
        const overlapping = state.tileGridGeometry.getOverlappingTilesOnGrid(bounds)

        for (const r of overlapping) {
          if (r.tile.id !== tileId) continue

          const rx = r.tileRelativeOffsetX * scale
          const ry = r.tileRelativeOffsetY * scale

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

      const { scale } = state
      cursor.draw(ctx, x, y, scale)
    },
  }
}
