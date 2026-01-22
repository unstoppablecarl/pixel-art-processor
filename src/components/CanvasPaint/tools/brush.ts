import type { Point } from '../../../lib/node-data-types/BaseDataStructure.ts'
import { getPerfectCircleCoords, getRectCenterCoords, interpolateLine } from '../../../lib/util/data/Grid.ts'
import type { ToolHandler } from '../_canvas-editor-types.ts'
import type { EditorState } from '../editor-state.ts'
import type { Renderer } from '../renderer.ts'

export enum BrushShape {
  CIRCLE = 'CIRCLE',
  SQUARE = 'SQUARE'
}

export function makeBrushTool(state: EditorState, renderer: Renderer): ToolHandler {

  function paint(x: number, y: number) {
    let pixels: Point[] = []
    const { width, height, brushSize, brushShape } = state
    if (brushShape === BrushShape.CIRCLE) {
      pixels = getPerfectCircleCoords(x, y, brushSize / 2, width, height)
    } else {
      pixels = getRectCenterCoords(x, y, brushSize, brushSize, width, height)
    }

    state?.emitSetPixels?.(pixels)
  }

  return {
    onMouseDown: paint,
    onMouseMove(x: number, y: number): void {
      const { lastX, lastY } = state

      state.cursorX = x
      state.cursorY = y

      if (state.isDrawing) {
        // Interpolate between last position and current position
        const points = interpolateLine(
          Math.floor(lastX),
          Math.floor(lastY),
          Math.floor(x),
          Math.floor(y),
        )

        for (const point of points) {
          const ix = Math.floor(point.x)
          const iy = Math.floor(point.y)
          paint(ix, iy)
        }

        state.lastX = x
        state.lastY = y
      }
    },
    screenOverlayDraw(ctx: CanvasRenderingContext2D) {
      const { cursorX, cursorY, scale, brushSize, mouseIsOver } = state
      if (!mouseIsOver) return
      ctx.imageSmoothingEnabled = false

      const snappedX = Math.floor(cursorX)
      const snappedY = Math.floor(cursorY)
      const cx = Math.floor(brushSize / 2)

      const screenX = snappedX * scale - cx * scale
      const screenY = snappedY * scale - cx * scale

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.drawImage(renderer.cursor.canvas, Math.floor(screenX), Math.floor(screenY))
    },
  }
}
