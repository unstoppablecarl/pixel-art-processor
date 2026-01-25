import { makeReusablePixelCanvas } from '../../../lib/util/misc.ts'

import type { EditorState } from '../EditorState.ts'
import type { GlobalToolContext } from '../GlobalToolManager.ts'
import { BrushShape } from './brush.ts'

const pixelCanvas = makeReusablePixelCanvas()

type BrushSettings = Pick<EditorState, 'scale' | 'cursorColor'> & Pick<GlobalToolContext, 'brushShape' | 'brushSize'>

export type CursorCache = ReturnType<typeof makeCursorCache>
export function makeCursorCache(state: EditorState, toolContext: GlobalToolContext) {
  const { canvas, ctx } = pixelCanvas(1, 1)

  let prev: BrushSettings | undefined

  function changed(settings: BrushSettings): boolean {
    if (!prev) return true
    return (prev.scale !== settings.scale ||
      prev.cursorColor !== settings.cursorColor ||
      prev.brushShape !== settings.brushShape ||
      prev.brushSize !== settings.brushSize)
  }

  function updateCache() {
    const { scale, cursorColor } = state
    const { brushShape, brushSize } = toolContext
    if (!changed({ scale, cursorColor, brushShape, brushSize })) {
      return
    }

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

    prev = { scale, cursorColor, brushShape, brushSize }
  }

  return {
    updateCache,
    canvas,
    ctx,
  }
}