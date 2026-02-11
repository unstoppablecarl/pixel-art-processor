import type { DrawLayer } from '../../../components/CanvasEditor/_core/_core-editor-types.ts'
import { putImageData } from './ImageData.ts'
import { makeReusablePixelCanvas, type PixelCanvas } from './PixelCanvas.ts'

export function makeCanvasFrameRenderer() {
  const bufferCanvas = makeReusablePixelCanvas()

  return function renderCanvasFrame(
    pixelCanvas: PixelCanvas,
    scale: number,
    getImageData: () => ImageData | undefined | null,
    drawPixelLayer?: DrawLayer,
    drawScreenLayer?: DrawLayer,
  ) {
    const { canvas, ctx } = pixelCanvas
    const {ctx: pxCtx, canvas: pxCanvas} = bufferCanvas(canvas.width, canvas.height)

    // 1. Clear pixel buffer (unscaled)
    pxCtx.setTransform(1, 0, 0, 1, 0, 0)
    pxCtx.clearRect(0, 0, pxCanvas.width, pxCanvas.height)

    // 2. Draw pixel data into pixel buffer
    const img = getImageData()
    if (img) {
      putImageData(pxCtx, img)
    }

    drawPixelLayer?.(pxCtx)

    // 3. Draw pixel buffer scaled onto screen
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.setTransform(scale, 0, 0, scale, 0, 0)
    ctx.drawImage(pxCanvas, 0, 0)

    // 4. Draw overlays in screen space
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    drawScreenLayer?.(ctx)
  }
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