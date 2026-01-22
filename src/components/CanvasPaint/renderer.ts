import { putImageDataScaled } from '../../lib/util/html-dom/ImageData.ts'
import { type EditorState } from './EditorState.ts'
import { type GlobalToolContext } from './GlobalToolManager.ts'
import { makeCursorCache } from './tools/brush-cursor.ts'

export type ToolRenderer = ReturnType<typeof makeRenderer>

export function makeRenderer(state: EditorState, toolContext: GlobalToolContext) {

  let canvas: HTMLCanvasElement | null = null
  let ctx: CanvasRenderingContext2D | null = null
  let needsRender = false

  function initRenderer(el: HTMLCanvasElement) {
    canvas = el
    ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('Canvas 2D context unavailable')

    resizeCanvas()
    queueRender()
  }

  function resizeCanvas() {
    if (!canvas) return
    canvas.width = state.width * state.scale
    canvas.height = state.height * state.scale
    ctx!.imageSmoothingEnabled = false
  }

  function queueRender() {
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

    const targetImageData = state.target?.get()
    if (targetImageData) {
      putImageDataScaled(ctx, targetImageData.width, targetImageData.height, targetImageData)
    }

    state.pixelOverlayDraw?.(ctx)

    ctx.setTransform(1, 0, 0, 1, 0, 0)

    drawGrid(ctx)

    state?.screenOverlayDraw?.(ctx)
  }

  const gridCache = document.createElement('canvas')
  const gridCacheCtx = gridCache.getContext('2d')!

  function updateGridCache() {
    const ctx = gridCacheCtx
    const { gridColor, width, height, scale } = state
    const scaledWidth = state.scaledWidth
    const scaledHeight = state.scaledHeight

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    // Resize if needed
    if (gridCache.width !== scaledWidth || gridCache.height !== scaledHeight) {
      gridCache.width = scaledWidth
      gridCache.height = scaledHeight
    }
    ctx.translate(0.5, 0.5)
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

  return {
    state,
    cursor: makeCursorCache(state, toolContext),
    updateGridCache,
    drawGrid,
    initRenderer,
    resizeCanvas,
    queueRender,
    toolContext,
    get canvas() {
      return canvas
    },
    get ctx() {
      return ctx
    },
  }
}
