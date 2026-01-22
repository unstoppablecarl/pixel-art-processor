import type { Point } from '../../../lib/node-data-types/BaseDataStructure.ts'
import { getPerfectCircleCoords, getRectCenterCoords, interpolateLine } from '../../../lib/util/data/Grid.ts'
import { BrushShape, type EditorState } from '../renderer.ts'
import type { ToolHandler } from '../tools.ts'

// cursor cache can safely be re-used by multiple instances
let canvas: HTMLCanvasElement
let ctx: CanvasRenderingContext2D

export function updateCursorCache(state: EditorState) {
  if (!canvas) {
    canvas = document.createElement('canvas')
    if (!canvas) throw new Error('could not create html-dom')
  }
  if (!ctx) {
    ctx = canvas.getContext('2d')!
    if (!ctx) throw new Error('could not create context')
    ctx.imageSmoothingEnabled = false
  }

  const { scale, cursorColor, brushShape, brushSize } = state

  const size = brushSize * scale
  canvas.width = size + 1
  canvas.height = size + 1

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.strokeStyle = cursorColor
  ctx.lineWidth = 1

  if (brushShape === BrushShape.CIRCLE) {
    const r = Math.floor(brushSize / 2)
    const r2 = r * r
    const cx = Math.floor(brushSize / 2)

    ctx.beginPath()

    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y < r2) {
          const pixelX = cx + x
          const pixelY = cx + y
          const screenX = pixelX * scale
          const screenY = pixelY * scale

          // Check each edge and draw if neighbor is outside circle
          if ((x - 1) * (x - 1) + y * y >= r2) { // Left edge
            ctx.moveTo(screenX - 0.5, screenY)
            ctx.lineTo(screenX - 0.5, screenY + scale)
          }
          if ((x + 1) * (x + 1) + y * y >= r2) { // Right edge
            ctx.moveTo(screenX + scale + 0.5, screenY)
            ctx.lineTo(screenX + scale + 0.5, screenY + scale)
          }
          if (x * x + (y - 1) * (y - 1) >= r2) { // Top edge
            ctx.moveTo(screenX, screenY - 0.5)
            ctx.lineTo(screenX + scale, screenY - 0.5)
          }
          if (x * x + (y + 1) * (y + 1) >= r2) { // Bottom edge
            ctx.moveTo(screenX, screenY + scale + 0.5)
            ctx.lineTo(screenX + scale, screenY + scale + 0.5)
          }
        }
      }
    }

    ctx.stroke()
  } else {

    // mimic original: pixel-aligned square
    ctx.strokeRect(0.5, 0.5, size - 1, size - 1)
  }
}

export function makeBrushTool(state: EditorState): ToolHandler {

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
      ctx.drawImage(canvas, Math.floor(screenX), Math.floor(screenY))
    },
  }
}
