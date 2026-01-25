import type { Point } from '../../../lib/node-data-types/BaseDataStructure.ts'
import { getPerfectCircleCoords, getRectCenterCoords, interpolateLine } from '../../../lib/util/data/Grid.ts'
import { RGBA_WHITE } from '../../../lib/util/html-dom/ImageData.ts'
import type { TileId } from '../../../lib/wang-tiles/WangTileset.ts'
import { CanvasType, type ToolHandler } from '../_canvas-editor-types.ts'
import type { EditorState } from '../EditorState.ts'
import type { GlobalToolContext } from '../GlobalToolManager.ts'

export enum BrushShape {
  CIRCLE = 'CIRCLE',
  SQUARE = 'SQUARE'
}

export function makeBrushTool(toolContext: GlobalToolContext): ToolHandler {
  let isDrawing = false

  function getBrushPixels(
    x: number,
    y: number,
    w: number,
    h: number,
  ): Point[] {
    const { brushSize, brushShape } = toolContext
    if (brushShape === BrushShape.CIRCLE) {
      return getPerfectCircleCoords(x, y, brushSize / 2, w, h)
    } else {
      return getRectCenterCoords(x, y, brushSize, brushSize, w, h)
    }
  }

  function getGridBrushPixels(state: EditorState, x: number, y: number): Point[] {
    const { gridPixelWidth: width, gridPixelHeight: height } = state
    return getBrushPixels(x, y, width, height)
  }

  function getTileBrushPixels(state: EditorState, x: number, y: number): Point[] {
    const { tileSize } = state
    return getBrushPixels(x, y, tileSize, tileSize)
  }

  function writeBrushAt(
    state: EditorState,
    tileSheetWriter: any,
    canvasType: CanvasType,
    x: number,
    y: number,
    tileId?: TileId,
  ) {
    if (canvasType === CanvasType.GRID) {
      const pixels = getGridBrushPixels(state, x, y)
      tileSheetWriter.writeGridPixels(pixels, RGBA_WHITE)
    } else {
      const tilePixels = getTileBrushPixels(state, x, y)
      tileSheetWriter.writeTilePixels(tilePixels, tileId, RGBA_WHITE)
    }
  }

  return {
    inputBindings: {
      '[': () => toolContext.decreaseBrushSize(),
      ']': () => toolContext.increaseBrushSize(),
    },
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
        tileSheetWriter.writeGridPixels(pixels, RGBA_WHITE)
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
    gridScreenOverlayDraw({ state, gridRenderer }, ctx: CanvasRenderingContext2D) {
      if (state.hoverTileId === null) return
      const { scale, tileGrid, tileSize, hoverTilePixelX, hoverTilePixelY } = state
      const { brushSize } = toolContext

      const cx = Math.floor(brushSize / 2)

      const tileGridData = tileGrid.tileGrid.value

      tileGridData.eachWithTileId(state.hoverTileId, (x, y, v) => {
        const screenX = (x * tileSize + hoverTilePixelX! - cx) * scale
        const screenY = (y * tileSize + hoverTilePixelY! - cx) * scale
        ctx.drawImage(
          gridRenderer.cursor.canvas,
          Math.floor(screenX),
          Math.floor(screenY),
        )
      })
    },
    tileScreenOverlayDraw({ state, gridRenderer }, ctx, tileId) {
      if (tileId !== state.hoverTileId) return

      const x = state.hoverTilePixelX
      const y = state.hoverTilePixelY
      if (x == null || y == null) return

      const { scale } = state
      const { brushSize } = toolContext

      const cx = Math.floor(brushSize / 2)

      const screenX = (x - cx) * scale
      const screenY = (y - cx) * scale

      ctx.drawImage(
        gridRenderer.cursor.canvas,
        Math.floor(screenX),
        Math.floor(screenY),
      )
    },
  }
}
