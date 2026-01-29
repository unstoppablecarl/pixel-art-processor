import { putImageDataScaled } from '../../../lib/util/html-dom/ImageData.ts'
import type { PixelCanvas } from '../../../lib/util/html-dom/PixelCanvas.ts'
import type { DrawLayer } from '../../CanvasPaint/_canvas-paint-types.ts'

export function renderCanvasFrame(
  pixelCanvas: PixelCanvas | undefined,
  scale: number,
  getImageData: () => ImageData | undefined | null,
  drawPixelLayer?: DrawLayer,
  drawScreenLayer?: DrawLayer,
) {
  if (!pixelCanvas) return
  const { canvas, ctx } = pixelCanvas

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // pixel space
  ctx.scale(scale, scale)

  const targetImageData = getImageData()
  if (targetImageData) {
    putImageDataScaled(ctx, targetImageData)
  }

  drawPixelLayer?.(ctx)

  // screen space
  ctx.setTransform(1, 0, 0, 1, 0, 0)

  drawScreenLayer?.(ctx)
}

export function makeRenderQueue(cb: () => void) {
  let needsRender = false
  return () => {
    if (needsRender) return
    needsRender = true

    requestAnimationFrame(() => {
      needsRender = false
      cb()
    })
  }
}