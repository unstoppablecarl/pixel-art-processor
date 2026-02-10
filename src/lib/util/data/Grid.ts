import type { Point } from '../../node-data-types/BaseDataStructure.ts'

/**
 * Logic to determine if a pixel is inside the circle.
 * This specific formula matches standard pixel art tools like Photoshop/Aseprite
 * for "aesthetic" circles.
 */
export function isInsideCircle(x: number, y: number, r: number): boolean {
  // r^2 + r is a common heuristic for nice-looking pixel circles
  // It handles both even and odd sizes gracefully.
  return (x * x + y * y) < (r * r + r)
}

export function getPerfectCircleCoords(
  centerX: number,
  centerY: number,
  brushSize: number,
  targetWidth?: number,
  targetHeight?: number,
): Point[] {
  const result: Point[] = []

  const r = (brushSize - 1) / 2
  const limit = Math.ceil(r)

  for (let y = -limit; y <= limit; y++) {
    for (let x = -limit; x <= limit; x++) {
      const cx = centerX + x
      const cy = centerY + y

      if (targetWidth !== undefined && (cx < 0 || cx >= targetWidth)) continue
      if (targetHeight !== undefined && (cy < 0 || cy >= targetHeight)) continue

      if (isInsideCircle(x, y, r)) {
        result.push({
          x: Math.floor(cx),
          y: Math.floor(cy),
        })
      }
    }
  }
  return result
}

export function getRectCenterCoords(
  x: number,
  y: number,
  width: number,
  height: number,
  targetWidth: number,
  targetHeight: number,
): Point[] {

  const result: Point[] = []

  // Compute top-left corner from center
  const halfW = Math.floor(width / 2)
  const halfH = Math.floor(height / 2)

  const rawStartX = x - halfW
  const rawStartY = y - halfH
  const rawEndX = rawStartX + width
  const rawEndY = rawStartY + height

  // Clamp to bounds
  const startX = Math.max(0, rawStartX)
  const startY = Math.max(0, rawStartY)
  const endX = Math.min(targetWidth, rawEndX)
  const endY = Math.min(targetHeight, rawEndY)

  for (let py = startY; py < endY; py++) {
    for (let px = startX; px < endX; px++) {
      result.push({ x: px, y: py })
    }
  }

  return result
}

export function mirrorTilePixelHorizontal(x: number, y: number, tileSize: number): Point {
  return {
    x: tileSize - 1 - x,
    y,
  }
}

export function mirrorTilePixelVertical(x: number, y: number, tileSize: number): Point {
  return {
    x,
    y: tileSize - 1 - y,
  }
}

export function getPointsInEdgeMargins(
  point: Point,
  tileSize: number,
  margin: number = 1,
  result: Record<string, Point[]>,
): Record<string, Point[]> {
  const dir: Record<string, (p: Point) => boolean> = {
    N: (p: Point) => p.y < margin,
    S: (p: Point) => p.y >= tileSize - margin,
    E: (p: Point) => p.x >= tileSize - margin,
    W: (p: Point) => p.x < margin,
  }

  Object.entries(dir).forEach(([edge, fn]) => {
    if (!fn(point)) return
    result[edge].push({ x: point.x, y: point.y })
  })
  return result
}

export function interpolateLine(x0: number, y0: number, x1: number, y1: number) {
  const points = []

  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)

  const sx = dx === 0 ? 0 : (x0 < x1 ? 1 : -1)
  const sy = dy === 0 ? 0 : (y0 < y1 ? 1 : -1)

  let err = dx - dy
  let x = Math.floor(x0)
  let y = Math.floor(y0)

  let safety = 0

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

    if (++safety > 5000) break
  }

  return points
}