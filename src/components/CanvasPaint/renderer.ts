import { makeEditorState } from './editorState.ts'

let canvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null

let needsRender = false

export function makeEditor() {
  const state = makeEditorState()

  function initRenderer(el: HTMLCanvasElement) {
    canvas = el
    ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context unavailable')

    resizeCanvas()
    scheduleRender()
  }

  function resizeCanvas() {
    if (!canvas) return
    canvas.width = state.width * state.scale
    canvas.height = state.height * state.scale
  }

  function scheduleRender() {
    if (needsRender) return
    needsRender = true

    requestAnimationFrame(() => {
      needsRender = false
      renderFrame()
    })
  }

  function renderFrame() {
    if (!canvas || !ctx) return

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.scale(state.scale, state.scale)

    state?.externalDraw?.(ctx)

    ctx.setTransform(1, 0, 0, 1, 0, 0)

    drawGrid(ctx)
    drawSelection(ctx)
    drawCursor(ctx)
  }

  function drawSelection(ctx: CanvasRenderingContext2D) {
    const sel = state.selection
    if (!sel) return

    ctx.strokeStyle = 'cyan'
    ctx.lineWidth = 1 / state.scale
    ctx.strokeRect(sel.x, sel.y, sel.w, sel.h)
  }

  const gridCache = document.createElement('canvas')
  const gridCacheCtx = gridCache.getContext('2d')!

  function updateGridCache() {
    const ctx = gridCacheCtx
    const { gridColor, width, height, scale } = state
    const scaledWidth = state.scaledWidth
    const scaledHeight = state.scaledHeight

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

  function drawGrid(ctx: CanvasRenderingContext2D) {
    ctx.drawImage(gridCache, 0, 0)
  }

  const cursorCache = document.createElement('canvas')
  const cursorCacheCtx = cursorCache.getContext('2d')!

  function updateCursorCache() {
    const ctx = cursorCacheCtx
    const { scale, cursorColor, brushShape, brushSize } = state

    const size = brushSize * scale
    cursorCache.width = size + 1
    cursorCache.height = size + 1

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, size, size)
    ctx.strokeStyle = cursorColor
    ctx.lineWidth = 1

    if (brushShape === 'circle') {
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

  function drawCursor(ctx: CanvasRenderingContext2D) {
    const { cursorX, cursorY, scale, brushSize } = state

    const snappedX = Math.floor(cursorX)
    const snappedY = Math.floor(cursorY)
    const cx = Math.floor(brushSize / 2)

    const screenX = snappedX * scale - cx * scale
    const screenY = snappedY * scale - cx * scale

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.drawImage(cursorCache, Math.floor(screenX), Math.floor(screenY))
  }

  return {
    state,
    drawCursor,
    updateCursorCache,
    updateGridCache,
    drawGrid,
    drawSelection,
    initRenderer,
    scheduleRender,
  }
}

