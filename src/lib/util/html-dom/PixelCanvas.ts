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
  x: number = 0,
  y: number = 0,
  fontSize = 10,
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
