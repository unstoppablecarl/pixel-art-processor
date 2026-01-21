import { editorState } from './editorState'

let canvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null

let needsRender = false

export function initRenderer(el: HTMLCanvasElement) {
  canvas = el
  ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')

  resizeCanvas()
  scheduleRender()
}

export function resizeCanvas() {
  if (!canvas) return
  canvas.width = editorState.width * editorState.scale
  canvas.height = editorState.height * editorState.scale
}

export function scheduleRender() {
  if (needsRender) return
  needsRender = true

  requestAnimationFrame(() => {
    needsRender = false
    renderFrame()
  })
}

export function renderFrame() {
  if (!canvas || !ctx) return

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  ctx.scale(editorState.scale, editorState.scale)

  editorState?.externalDraw?.(ctx)

  ctx.setTransform(1, 0, 0, 1, 0, 0)

  drawGrid(ctx)
  drawSelection(ctx)
  drawCursor(ctx)
}

export function drawSelection(ctx: CanvasRenderingContext2D) {
  const sel = editorState.selection
  if (!sel) return

  ctx.strokeStyle = 'cyan'
  ctx.lineWidth = 1 / editorState.scale
  ctx.strokeRect(sel.x, sel.y, sel.w, sel.h)
}

export const gridCache = document.createElement('canvas')
const gridCacheCtx = gridCache.getContext('2d')!

export function updateGridCache() {
  const ctx = gridCacheCtx
  const { gridColor, width, height, scale } = editorState
  const scaledWidth = editorState.scaledWidth
  const scaledHeight = editorState.scaledHeight

  // Resize if needed
  if (gridCache.width !== scaledWidth || gridCache.height !== scaledHeight) {
    gridCache.width = scaledWidth
    gridCache.height = scaledHeight
  }

  ctx.clearRect(0, 0, gridCache.width, gridCache.height)
  ctx.strokeStyle = gridColor
  ctx.lineWidth = 1

  // Draw vertical lines
  for (let x = 0; x <= width; x++) {
    const screenX = x * scale
    ctx.beginPath()
    ctx.moveTo(screenX, 0)
    ctx.lineTo(screenX, scaledHeight)
    ctx.stroke()
  }

  // Draw horizontal lines
  for (let y = 0; y <= height; y++) {
    const screenY = y * scale
    ctx.beginPath()
    ctx.moveTo(0, screenY)
    ctx.lineTo(scaledWidth, screenY)
    ctx.stroke()
  }
}

export function drawGrid(ctx: CanvasRenderingContext2D) {
  ctx.drawImage(gridCache, 0, 0)
}

const cursorCache = document.createElement('canvas')
const cursorCacheCtx = cursorCache.getContext('2d')!

export function updateCursorCache() {
  const {
    scale,
    cursorColor,
    brushShape,
    brushSize,
  } = editorState

  // Cursor canvas is just big enough for the brush in screen pixels
  const size = brushSize * scale
  cursorCache.width = size + 1
  cursorCache.height = size + 1

  const ctx = cursorCacheCtx
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, size, size)
  ctx.strokeStyle = cursorColor
  ctx.lineWidth = 1

  if (brushShape === 'circle') {
    const r = Math.floor(brushSize / 2)
    const r2 = r * r

    // center pixel index in brush space
    const centerPixelX = Math.floor(brushSize / 2)
    const centerPixelY = Math.floor(brushSize / 2)

    ctx.beginPath()

    // Trace the outline by checking each pixel and drawing edges
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y < r2) {
          const pixelX = centerPixelX + x
          const pixelY = centerPixelY + y
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
    // square brush: full rect in the brush canvas
    const size = brushSize * scale
    cursorCache.width = size
    cursorCache.height = size

    ctx.clearRect(0, 0, size, size)
    ctx.strokeStyle = cursorColor
    ctx.lineWidth = 1

    // mimic original: pixel-aligned square
    ctx.strokeRect(0.5, 0.5, size - 1, size - 1)
  }
}

export function drawCursor(ctx: CanvasRenderingContext2D) {
  const { cursorX, cursorY, scale, brushSize } = editorState

  // snap to pixel grid like original
  const snappedX = Math.floor(cursorX)
  const snappedY = Math.floor(cursorY)

  const centerPixelX = Math.floor(brushSize / 2)
  const centerPixelY = Math.floor(brushSize / 2)

  // top-left of the brush in screen space
  const screenX = (snappedX - centerPixelX) * scale
  const screenY = (snappedY - centerPixelY) * scale

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.drawImage(cursorCache, Math.floor(screenX), Math.floor(screenY))
}
