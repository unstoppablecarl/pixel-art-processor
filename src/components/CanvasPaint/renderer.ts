export enum Tool {
  BRUSH = 'BRUSH',
  SELECT = 'SELECT'
}

export type BrushShape = 'circle' | 'square'
export type BrushMode = 'add' | 'remove'

export type EditorState = ReturnType<typeof makeEditorState>
export type Renderer = ReturnType<typeof makeRenderer>

export function makeEditorState() {
  return {
    width: 64,
    height: 64,
    scale: 8,

    cursorX: 0,
    cursorY: 0,
    mouseIsOver: false,
    isDrawing: false,
    lastX: 0,
    lastY: 0,

    imageData: null as ImageData | null,

    tool: Tool.BRUSH as Tool,
    brushSize: 1,
    brushShape: 'circle' as BrushShape,

    gridColor: 'rgba(0, 0, 0, 0.2)',
    cursorColor: 'rgba(0, 255, 255, 1)',

    get scaledWidth() {
      return this.scale * this.width
    },

    get scaledHeight() {
      return this.scale * this.height
    },

    externalDraw: null as ((ctx: CanvasRenderingContext2D) => void) | null,

    emitSetPixels: null as ((pixels: { x: number; y: number }[]) => void) | null,

    selection: null as null | {
      x: number
      y: number
      w: number
      h: number
      pixels: ImageData | null
      dragging: boolean
      offsetX: number
      offsetY: number
    },
  }
}

export function makeRenderer() {
  const state = makeEditorState()
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

    if (sel.pixels) {
      ctx.setTransform(state.scale, 0, 0, state.scale, 0, 0)
      ctx.putImageData(sel.pixels, sel.x, sel.y)
      ctx.setTransform(1,0,0,1,0,0)
    }
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

  const cursorCache = document.createElement('canvas')
  const cursorCacheCtx = cursorCache.getContext('2d')!
  cursorCacheCtx.imageSmoothingEnabled = false

  function updateCursorCache() {
    const ctx = cursorCacheCtx
    const { scale, cursorColor, brushShape, brushSize } = state

    const size = brushSize * scale
    cursorCache.width = size + 1
    cursorCache.height = size + 1

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, cursorCache.width, cursorCache.height)
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

      // mimic original: pixel-aligned square
      ctx.strokeRect(0.5, 0.5, size - 1, size - 1)
    }
  }

  function drawCursor(ctx: CanvasRenderingContext2D) {
    const { cursorX, cursorY, scale, brushSize, mouseIsOver } = state
    if (!mouseIsOver) return
    ctx.imageSmoothingEnabled = false

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
    resizeCanvas,
    queueRender,
    get canvas() {
      return canvas
    },
    get ctx() {
      return ctx
    },
  }
}