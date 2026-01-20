import type { Point } from '../../node-data-types/BaseDataStructure.ts'

export function getPerfectCircleCoords(
  centerX: number,
  centerY: number,
  radius: number,
  targetWidth?: number,
  targetHeight?: number,
): Point[] {

  const result: Point[] = []
  const r = Math.floor(radius)
  const r2 = r * r

  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y < r2) {
        const px = Math.floor(centerX + x)
        const py = Math.floor(centerY + y)

        if (targetWidth !== undefined && (px < 0 || px >= targetWidth)) continue
        if (targetHeight !== undefined && (py < 0 || py >= targetHeight)) continue

        result.push({ x: px, y: py })
      }
    }
  }

  return result
}

export function getRectCoords(
  x: number,
  y: number,
  width: number,
  height: number,
  targetWidth: number,
  targetHeight: number,
): Point[] {

  const result: Point[] = []

  // Clamp to bounds
  const startX = Math.max(0, x)
  const startY = Math.max(0, y)
  const endX = Math.min(targetWidth, x + width)
  const endY = Math.min(targetHeight, y + height)

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