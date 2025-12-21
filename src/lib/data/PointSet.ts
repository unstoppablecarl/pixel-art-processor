import PoissonDiskSampling from 'poisson-disk-sampling'
import type { Point } from '../step-data-types/BaseDataStructure.ts'
import type { BitMask } from '../step-data-types/BitMask.ts'
import { prng } from '../util/prng.ts'

export class PointSet extends Map<string, Point> {
  add(x: number, y: number) {
    const key = x + ',' + y
    if (this.has(key)) return

    this.set(key, { x, y })
  }

  addMultiple(points: Point[]) {
    for (let i = 0; i < points.length; i++) {
      const { x, y } = points[i] as Point
      this.add(x, y)
    }
  }

  contains(x: number, y: number) {
    return this.has(x + ',' + y)
  }

  toArray() {
    return [...this.values()]
  }
}

export function addRandomInnerPoints(
  mask: BitMask,
  minDistance = 15,
  maxDistance = 30,
  tries = 10,
  borderBuffer = 2,
) {

  const p = new PoissonDiskSampling({
    shape: [
      mask.width - (borderBuffer * 2),
      mask.height - (borderBuffer * 2),
    ],
    minDistance,
    maxDistance,
    tries,
  }, prng)

  const existingPoints = new PointSet()

  mask.each((x, y, value) => {
    if (value === 1) {
      p.addPoint([x, y])
      existingPoints.add(x, y)
    }
  })

  p.fill()

  const points: Point[] = []

  p.getAllPoints()
    .forEach(([x, y]) => {
      x = Math.floor(x)
      y = Math.floor(y)
      if (!existingPoints.contains(x, y)) {
        x += borderBuffer
        y += borderBuffer
        points.push({ x, y })
        mask.set(x, y, 1)
      }
    })

  return points
}