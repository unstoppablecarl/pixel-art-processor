import { readonly, ref, watchEffect } from 'vue'
import { useCanvasEditToolStore } from '../../../../lib/store/canvas-edit-tool-store.ts'
import { useUIStore } from '../../../../lib/store/ui-store.ts'
import { getRectFromCenter, isInsideCircle } from '../../../../lib/util/data/Grid.ts'
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

export function makeBrushCursor() {
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

    if (brushShape === BrushShape.CIRCLE) {
      const r = brushSize / 2
      const minOffset = -Math.ceil(r - 0.5)
      const maxOffset = Math.floor(r - 0.5)
      const centerOffset = (brushSize % 2 === 0) ? 0.5 : 0

      for (let y = minOffset; y <= maxOffset; y++) {
        for (let x = minOffset; x <= maxOffset; x++) {
          if (isInsideCircle(x + centerOffset, y + centerOffset, r)) {
            // Convert from relative coords to screen coords
            const sx = (x - minOffset) * scale
            const sy = (y - minOffset) * scale

            // LEFT EDGE - check if pixel to the left is outside
            if (!isInsideCircle(x - 1 + centerOffset, y + centerOffset, r)) {
              ctx.fillRect(sx - 1, sy, 1, scale)
            }
            // RIGHT EDGE - check if pixel to the right is outside
            if (!isInsideCircle(x + 1 + centerOffset, y + centerOffset, r)) {
              ctx.fillRect(sx + scale, sy, 1, scale)
            }
            // TOP EDGE - check if pixel above is outside
            if (!isInsideCircle(x + centerOffset, y - 1 + centerOffset, r)) {
              // Extend line to cover corners if needed
              const leftOut = !isInsideCircle(x - 1 + centerOffset, y - 1 + centerOffset, r)
              const rightOut = !isInsideCircle(x + 1 + centerOffset, y - 1 + centerOffset, r)

              const xOff = leftOut ? -1 : 0
              const wOff = rightOut ? 1 : 0

              ctx.fillRect(sx + xOff, sy - 1, scale - xOff + wOff, 1)
            }
            // BOTTOM EDGE - check if pixel below is outside
            if (!isInsideCircle(x + centerOffset, y + 1 + centerOffset, r)) {
              // Extend line to cover corners if needed
              const leftOut = !isInsideCircle(x - 1 + centerOffset, y + 1 + centerOffset, r)
              const rightOut = !isInsideCircle(x + 1 + centerOffset, y + 1 + centerOffset, r)

              const xOff = leftOut ? -1 : 0
              const wOff = rightOut ? 1 : 0

              ctx.fillRect(sx + xOff, sy + scale, scale - xOff + wOff, 1)
            }
          }
        }
      }
    } else {
      ctx.fillRect(-1, -1, footprint + 2, 1) // Top
      ctx.fillRect(-1, footprint, footprint + 2, 1) // Bottom
      ctx.fillRect(-1, 0, 1, footprint) // Left
      ctx.fillRect(footprint, 0, 1, footprint) // Right
    }

    version.value++
    current = newState
  }

  const offScratch = { dx: 0, dy: 0 }

  function getOrigin(brushSize: number, x: number, y: number, scale = 1) {
    const r = brushSize / 2
    const minOffset = -Math.ceil(r - 0.5)

    const dx = (x * scale) + (minOffset * scale) - 2
    const dy = (y * scale) + (minOffset * scale) - 2

    offScratch.dx = dx
    offScratch.dy = dy

    return offScratch
  }

  return {
    update,
    canvas,
    ctx,
    get brushSize() {
      return current!.brushSize
    },
    watchTarget: readonly(version),
    getBounds(x: number, y: number) {
      const { dx, dy } = getOrigin(current!.brushSize, x, y)
      return getRectFromCenter(dx, dy, current!.brushSize, current!.brushSize)
    },
    draw(drawCtx: CanvasRenderingContext2D, x: number, y: number, scale = 1) {
      if (!current) return

      const { dx, dy } = getOrigin(current.brushSize, x, y, scale)

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