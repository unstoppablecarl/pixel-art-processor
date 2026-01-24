import { putImageDataScaled } from '../../../lib/util/html-dom/ImageData.ts'
import type { PixelCanvas } from '../../../lib/util/misc.ts'
import type { ImageDataRef } from '../../../lib/vue/vue-image-data.ts'
import type { DrawLayer } from '../_canvas-editor-types.ts'

export function renderCanvasFrame(
  pixelCanvas: PixelCanvas | undefined,
  scale: number,
  targetImageDataRef: ImageDataRef,
  drawPixelLayer?: DrawLayer,
  drawScreenLayer?: DrawLayer,
) {
  if (!pixelCanvas) return
  const { canvas, ctx } = pixelCanvas

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // pixel space
  ctx.scale(scale, scale)

  const targetImageData = targetImageDataRef?.get()
  if (targetImageData) {
    putImageDataScaled(ctx, targetImageData.width, targetImageData.height, targetImageData)
  }

  drawPixelLayer?.(ctx)

  // screen space
  ctx.setTransform(1, 0, 0, 1, 0, 0)

  drawScreenLayer?.(ctx)
}