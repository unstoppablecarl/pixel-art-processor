import { readonly, ref, watchEffect } from 'vue'
import { useCanvasEditToolStore } from '../../../lib/store/canvas-edit-tool-store.ts'
import { useUIStore } from '../../../lib/store/ui-store.ts'
import { makeReusablePixelCanvas } from '../../../lib/util/html-dom/PixelCanvas.ts'
import { BrushShape } from '../_core-editor-types.ts'

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
  if (state) {
    update(state)
  }

  function changed(settings: BrushSettings): boolean {
    if (!current) return true
    return (current.scale !== settings.scale ||
      current.cursorColor !== settings.cursorColor ||
      current.brushShape !== settings.brushShape ||
      current.brushSize !== settings.brushSize)
  }

  let scaledBrushSize: number = 0

  function update(newState: BrushSettings) {

    const { scale, cursorColor, brushShape, brushSize } = newState
    if (!changed({ scale, cursorColor, brushShape, brushSize })) {
      return
    }

    scaledBrushSize = brushSize * scale + 1
    canvas.width = scaledBrushSize
    canvas.height = scaledBrushSize

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
      ctx.strokeRect(0.5, 0.5, scaledBrushSize - 1, scaledBrushSize - 1)
    }
    version.value++
    current = newState
  }

  return {
    update,
    canvas,
    ctx,
    watchTarget: readonly(version),
    draw(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1) {
      if (!current) return
      const offset = Math.floor(scaledBrushSize * 0.5)

      ctx.drawImage(
        canvas,
        Math.floor(x * scale - offset),
        Math.floor(y * scale - offset),
      )
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