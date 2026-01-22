import { makePixelCanvas } from '../../../lib/util/misc.ts'

import type { EditorState } from '../editor-state.ts'
import { BrushShape } from './brush.ts'

// cursor cache can safely be re-used by multiple instances
let _canvas: HTMLCanvasElement | undefined
let _ctx: CanvasRenderingContext2D | undefined

export function makeCursorCache(state: EditorState) {
  if (!_canvas || !_ctx) {
    const c = makePixelCanvas()
    _canvas = c.canvas
    _ctx = c.ctx
  }

  const canvas: HTMLCanvasElement = _canvas
  const ctx: CanvasRenderingContext2D = _ctx

  function updateCache() {

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

  return {
    updateCache,
    canvas,
    ctx,
  }
}