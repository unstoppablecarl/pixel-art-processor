export type PixelCanvas = {
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  resize: (w: number, h: number) => void
}

export function makePixelCanvas(canvas: HTMLCanvasElement = document.createElement('canvas')): PixelCanvas {
  const ctx = getCanvasPixelContext(canvas)
  return pixelCanvas(canvas, ctx)
}

export function getCanvasPixelContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('could not create 2d context')
  ctx.imageSmoothingEnabled = false
  return ctx
}

export function makeReusablePixelCanvas() {
  let canvas: HTMLCanvasElement | null = null
  let ctx: CanvasRenderingContext2D | null = null

  return function getReusableCanvas(width: number, height: number): PixelCanvas {
    if (!canvas || !ctx) {
      const c = makePixelCanvas()
      canvas = c.canvas
      ctx = c.ctx
    }

    // Resize if needed (resizing auto-clears)
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
      ctx.imageSmoothingEnabled = false
    } else {
      // Same size → manually clear
      ctx.clearRect(0, 0, width, height)
    }

    return pixelCanvas(canvas, ctx)
  }
}

function pixelCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): PixelCanvas {
  return {
    get canvas() {
      return canvas
    },
    get ctx() {
      return ctx
    },
    resize(w: number, h: number) {
      canvas.width = w
      canvas.height = h
      ctx.imageSmoothingEnabled = false
    },
  }
}

export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fontSize = 20,
  font = 'sans-serif',
  color = '#00ff00',
) {
  ctx.font = fontSize + 'px ' + font

  ctx.strokeStyle = 'rgba(0,0,0,0.75)'
  ctx.lineWidth = 5
  ctx.fillStyle = color

  x += fontSize * 0.5
  y += fontSize * 1.5
  ctx.strokeText(text, x, y)
  ctx.fillText(text, x, y)
}
