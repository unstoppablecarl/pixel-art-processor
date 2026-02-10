import { readonly, ref, watchEffect } from 'vue'
import { useCanvasEditToolStore } from '../../../../lib/store/canvas-edit-tool-store.ts'
import { useUIStore } from '../../../../lib/store/ui-store.ts'
import { makeReusablePixelCanvas } from '../../../../lib/util/html-dom/PixelCanvas.ts'
import { BrushShape } from '../../_core-editor-types.ts'

const pixelCanvas = makeReusablePixelCanvas()

export type BrushSettings = {
  scale: number,
  cursorColor: string,
  brushShape: BrushShape,
  brushSize: number,
}

export type BrushCursor = ReturnType<typeof makeBrushCursor>

export function makeBrushCursor(state?: BrushSettings) {
  const { canvas, ctx } = pixelCanvas(1, 1)
  const version = ref(0)
  let current: BrushSettings | undefined

  function update(newState: BrushSettings) {
    const { scale, cursorColor, brushShape, brushSize } = newState

    const footprint = brushSize * scale
    // 1px for border + 1px for gutter on each side = 4px total padding
    canvas.width = footprint + 4
    canvas.height = footprint + 4

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = cursorColor

    // Integer alignment for fillRect
    const gutter = 2
    ctx.translate(gutter, gutter)

    const r = (brushSize - 1) / 2
    const rThreshold = (r * r + r)

    if (brushShape === BrushShape.CIRCLE) {
      const limit = Math.ceil(r)

      for (let y = -limit; y <= limit; y++) {
        const yy = y * y
        for (let x = -limit; x <= limit; x++) {
          const xx = x * x
          if (xx + yy < rThreshold) {
            const sx = (limit + x) * scale
            const sy = (limit + y) * scale

            // LEFT EDGE
            if ((x - 1) * (x - 1) + yy >= rThreshold) {
              ctx.fillRect(sx - 1, sy, 1, scale)
            }
            // RIGHT EDGE
            if ((x + 1) * (x + 1) + yy >= rThreshold) {
              ctx.fillRect(sx + scale, sy, 1, scale)
            }
            // TOP EDGE
            if (xx + (y - 1) * (y - 1) >= rThreshold) {
              // Only extend the horizontal line if the left/right neighbors
              // also don't have a pixel above them.

              const xOff = (x === -limit || (x - 1) * (x - 1) + (y - 1) * (y - 1) >= rThreshold) ? -1 : 0
              const wOff = (x === limit || (x + 1) * (x + 1) + (y - 1) * (y - 1) >= rThreshold) ? 1 : 0

              ctx.fillRect(sx + xOff, sy - 1, scale - xOff + wOff, 1)
            }
            // BOTTOM EDGE
            if (xx + (y + 1) * (y + 1) >= rThreshold) {
              const xOff = (x === -limit || (x - 1) * (x - 1) + (y + 1) * (y + 1) >= rThreshold) ? -1 : 0
              const wOff = (x === limit || (x + 1) * (x + 1) + (y + 1) * (y + 1) >= rThreshold) ? 1 : 0

              ctx.fillRect(sx + xOff, sy + scale, scale - xOff + wOff, 1)
            }
          }
        }
      }
    } else {
      // Square remains simple and sharp
      ctx.fillRect(-1, -1, footprint + 2, 1) // Top
      ctx.fillRect(-1, footprint, footprint + 2, 1) // Bottom
      ctx.fillRect(-1, 0, 1, footprint) // Left
      ctx.fillRect(footprint, 0, 1, footprint) // Right
    }

    version.value++
    current = newState
  }

  return {
    update,
    canvas,
    ctx,
    watchTarget: readonly(version),
    draw(drawCtx: CanvasRenderingContext2D, x: number, y: number, scale = 1) {
      if (!current) return

      const r = (current.brushSize - 1) / 2
      const limit = Math.ceil(r)

      const dx = (x * scale) - (limit * scale) - 2
      const dy = (y * scale) - (limit * scale) - 2

      drawCtx.drawImage(canvas, Math.floor(dx), Math.floor(dy))
    },
  }
}

let BRUSH_CURSOR: BrushCursor

export function useBrushCursor() {
  const uiStore = useUIStore()
  const canvasStore = useCanvasEditToolStore()

  if (!BRUSH_CURSOR) {
    BRUSH_CURSOR = makeBrushCursor()
    watchEffect(() => {
      BRUSH_CURSOR.update({
        scale: uiStore.imgScale,
        brushSize: canvasStore.brushSize,
        brushShape: canvasStore.brushShape,
        cursorColor: canvasStore.cursorColor,
      })
    })
  }

  return BRUSH_CURSOR
}