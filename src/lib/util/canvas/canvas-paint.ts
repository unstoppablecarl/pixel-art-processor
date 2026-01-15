import type { Position } from '../../pipeline/_types.ts'

export const drawPixelPerfectCircle = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number, fillColor: string): void => {
  const r = Math.floor(radius)
  const r2 = r * r

  ctx.fillStyle = fillColor

  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y < r2) {
        ctx.fillRect(Math.floor(centerX + x), Math.floor(centerY + y), 1, 1)
      }
    }
  }
}

export const drawPixelPerfectSquare = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, size: number, fillColor: string): void => {
  const halfSize = Math.floor(size / 2)
  ctx.fillStyle = fillColor
  ctx.fillRect(Math.floor(centerX - halfSize), Math.floor(centerY - halfSize), size, size)
}

export const interpolateLine = (x0: number, y0: number, x1: number, y1: number): Position[] => {
  const points: Position[] = []
  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx - dy

  let x = x0
  let y = y0

  while (true) {
    points.push({ x, y })

    if (x === x1 && y === y1) break

    const e2 = 2 * err
    if (e2 > -dy) {
      err -= dy
      x += sx
    }
    if (e2 < dx) {
      err += dx
      y += sy
    }
  }

  return points
}