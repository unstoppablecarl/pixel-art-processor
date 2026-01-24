import type { Point } from '../../../lib/node-data-types/BaseDataStructure.ts'
import { getPerfectCircleCoords, getRectCenterCoords, interpolateLine } from '../../../lib/util/data/Grid.ts'
import { RGBA_WHITE } from '../../../lib/util/html-dom/ImageData.ts'
import type { ToolHandler } from '../_canvas-editor-types.ts'
import type { EditorState } from '../EditorState.ts'
import type { GlobalToolContext } from '../GlobalToolManager.ts'
import type { TileSheetWriter } from '../TileSheetWriter.ts'

export enum BrushShape {
  CIRCLE = 'CIRCLE',
  SQUARE = 'SQUARE'
}

export function makeBrushTool(toolContext: GlobalToolContext): ToolHandler {
  let isDrawing = false

  function paint(state: EditorState, tilesetWriter: TileSheetWriter, x: number, y: number) {
    let pixels: Point[] = []
    const { gridPixelWidth: width, gridPixelHeight: height } = state
    const { brushSize, brushShape } = toolContext

    if (brushShape === BrushShape.CIRCLE) {
      pixels = getPerfectCircleCoords(x, y, brushSize / 2, width, height)
    } else {
      pixels = getRectCenterCoords(x, y, brushSize, brushSize, width, height)
    }

    tilesetWriter.writeGridPixels(pixels, RGBA_WHITE)
    // state?.emitSetPixels?.(pixels)
  }

  return {
    inputBindings: {
      '[': () => toolContext.decreaseBrushSize(),
      ']': () => toolContext.increaseBrushSize(),
    },
    onMouseDown: ({ state, tileSheetWriter }, x, y) => {
      isDrawing = true
      paint(state, tileSheetWriter, x, y)
    },
    onDragStart({ state, tileSheetWriter }, x, y) {
      isDrawing = true
      paint(state, tileSheetWriter, x, y)
    },
    onDragMove({ state, tileSheetWriter }, x, y) {
      if (!isDrawing) return
      const { lastX, lastY } = state

      // Interpolate between last position and current position
      const points = interpolateLine(
        Math.floor(lastX!),
        Math.floor(lastY!),
        Math.floor(x),
        Math.floor(y),
      )

      for (const point of points) {
        const ix = Math.floor(point.x)
        const iy = Math.floor(point.y)
        paint(state, tileSheetWriter, ix, iy)
      }
    },
    onDragEnd() {
      isDrawing = false
    },
    onMouseMove({ gridRenderer }, x, y): void {
      // always draw cursor
      gridRenderer.queueRenderTiles()
      gridRenderer.queueRender()
    },
    screenOverlayDraw({ state, gridRenderer }, ctx: CanvasRenderingContext2D) {
      console.log('tileId', state.mouseOverTileId)
      console.log('tile', state.mouseOverTilePixelX, state.mouseOverTilePixelY)
      console.log('grid', state.cursorX, state.cursorY)

      const { cursorX, cursorY, scale, isMouseOver } = state
      const { brushSize } = toolContext

      // if (!isMouseOver) return
      ctx.imageSmoothingEnabled = false

      const snappedX = Math.floor(cursorX)
      const snappedY = Math.floor(cursorY)
      const cx = Math.floor(brushSize / 2)

      const screenX = snappedX * scale - cx * scale
      const screenY = snappedY * scale - cx * scale

      ctx.drawImage(gridRenderer.cursor.canvas, Math.floor(screenX), Math.floor(screenY))
    },
  }
}
