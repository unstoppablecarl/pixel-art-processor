import type { Point } from '../../../../lib/node-data-types/BaseDataStructure.ts'
import type { CanvasEditToolStore } from '../../../../lib/store/canvas-edit-tool-store.ts'
import { getPerfectCircleCoords, getRectCenterCoords, interpolateLine } from '../../../../lib/util/data/Grid.ts'
import { RGBA_WHITE } from '../../../../lib/util/html-dom/ImageData.ts'
import type { TileId } from '../../../../lib/wang-tiles/WangTileset.ts'
import { type BaseBlendModeToolHandler, BrushShape, TOOL_HOVER_CSS_CLASSES } from '../../_core-editor-types.ts'
import { useBrushCursor } from '../../_support/renderers/BrushCursor.ts'
import type { BrushToolState } from '../../_support/tools/BrushToolState.ts'
import {
  CanvasType,
  type LocalToolContext,
  type TileGridEditorToolHandlerArgs,
  type TileGridEditorToolHandlerRender,
} from '../_tile-grid-editor-types.ts'
import type { TileGridEditorState } from '../TileGridEditorState.ts'

export type TileGridBrushToolHandler<L = LocalToolContext<BrushToolState>> =
  BaseBlendModeToolHandler<L, TileGridEditorToolHandlerArgs>
  & TileGridEditorToolHandlerRender<L>

export function makeBrushTool(store: CanvasEditToolStore): TileGridBrushToolHandler {
  let isDrawing = false
  const cursor = useBrushCursor()

  function getBrushPixels(
    x: number,
    y: number,
    w: number,
    h: number,
  ): Point[] {
    if (store.brushShape === BrushShape.CIRCLE) {
      return getPerfectCircleCoords(x, y, store.brushSize / 2, w, h)
    } else {
      return getRectCenterCoords(x, y, store.brushSize, store.brushSize, w, h)
    }
  }

  function getGridBrushPixels(state: TileGridEditorState, x: number, y: number): Point[] {
    const { gridPixelWidth: width, gridPixelHeight: height } = state
    return getBrushPixels(x, y, width, height)
  }

  function getTileBrushPixels(state: TileGridEditorState, x: number, y: number): Point[] {
    const { tileSize } = state
    return getBrushPixels(x, y, tileSize, tileSize)
  }

  function writeBrushAt(
    state: TileGridEditorState,
    tileSheetWriter: any,
    canvasType: CanvasType,
    x: number,
    y: number,
    tileId?: TileId,
  ) {
    if (canvasType === CanvasType.GRID) {
      const pixels = getGridBrushPixels(state, x, y)
      tileSheetWriter.writeGridPixels(pixels, store.brushColor)
    } else {
      const tilePixels = getTileBrushPixels(state, x, y)
      tileSheetWriter.writeTilePixels(tilePixels, tileId, store.brushColor)
    }
  }

  return {
    cursorCssClass: TOOL_HOVER_CSS_CLASSES.BRUSH,
    onMouseDown: ({ state, tileSheetWriter }, x, y, canvasType, tileId) => {
      isDrawing = true
      writeBrushAt(state, tileSheetWriter, canvasType, x, y, tileId)
    },
    onDragStart({ state, tileSheetWriter }, x, y, canvasType, tileId) {
      isDrawing = true
      writeBrushAt(state, tileSheetWriter, canvasType, x, y, tileId)
    },
    onDragMove({ state, tileSheetWriter, gridRenderer }, x, y, canvasType, tileId) {
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
        for (const point of points) {
          const ix = Math.floor(point.x)
          const iy = Math.floor(point.y)
          getGridBrushPixels(state, ix, iy)
          pixels = pixels.concat(getGridBrushPixels(state, ix, iy))
        }

        tileSheetWriter.writeGridPixels(pixels, store.brushColor)
      }

      if (canvasType === CanvasType.TILE && tileId != null) {
        let allTilePixels: Point[] = []
        for (const p of points) {
          const ix = Math.floor(p.x)
          const iy = Math.floor(p.y)
          allTilePixels = allTilePixels.concat(getTileBrushPixels(state, ix, iy))
        }
        tileSheetWriter.writeTilePixels(allTilePixels, tileId, RGBA_WHITE)
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
      const { scale, tileGrid, tileSize, hoverTilePixelX, hoverTilePixelY } = state

      tileGrid.eachWithTileId(state.hoverTileId, (x, y, v) => {
        const screenX = (x * tileSize + hoverTilePixelX!) * scale
        const screenY = (y * tileSize + hoverTilePixelY!) * scale

        cursor.draw(ctx, screenX, screenY)
      })
    },
    tileScreenOverlayDraw({ state, toolState }, ctx, tileId) {
      if (tileId !== state.hoverTileId) return

      const x = state.hoverTilePixelX
      const y = state.hoverTilePixelY
      if (x == null || y == null) return

      const { scale } = state

      cursor.draw(ctx, x, y, scale)
    },
  }
}
