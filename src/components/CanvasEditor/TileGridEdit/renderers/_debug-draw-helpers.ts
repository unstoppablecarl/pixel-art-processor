import type { Rect } from '../../../../lib/util/data/Rect.ts'
import { drawText } from '../../../../lib/util/html-dom/PixelCanvas.ts'

export function drawDebugRect(ctx: CanvasRenderingContext2D, r: Rect, color: string) {
  ctx.globalAlpha = 1
  ctx.fillStyle = color
  ctx.fillRect(r.x, r.y, r.w, r.h)
}

export function drawDebugRectOutline(ctx: CanvasRenderingContext2D, r: Rect, scale: number, color: string, i: number) {
  const screenX = r.x * scale + 0.5
  const screenY = r.y * scale + 0.5
  const screenW = r.w * scale - 1
  const screenH = r.h * scale - 1

  ctx.strokeStyle = color
  ctx.lineWidth = 1
  ctx.strokeRect(screenX, screenY, screenW, screenH)

  drawText(
    ctx,
    i + '',
    screenX + 2 * scale,
    screenY + 2 * scale,
    undefined,
    undefined,
    'white',
  )
}
