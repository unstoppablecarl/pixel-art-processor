import PoissonDiskSampling from 'poisson-disk-sampling'
import type { Point } from '../step-data-types/BaseDataStructure.ts'
import { prng } from '../util/prng.ts'
import type { BitMask } from '../step-data-types/BitMask.ts'
import { Island } from '../step-data-types/BitMask/Island.ts'

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
) {

  const p = new PoissonDiskSampling({
    shape: [mask.width, mask.height],
    minDistance,
    maxDistance,
    tries,
  }, prng)

  const edgePoints = new PointSet()

  mask.each((x, y, value) => {
    if (value === 1) {
      p.addPoint([x, y])
      edgePoints.add(x, y)
    }
  })

  p.fill()

  const points: Point[] = []
  const islands: Island[] = []

  p.getAllPoints()
    .forEach(([x, y]) => {
      x = Math.floor(x)
      y = Math.floor(y)
      if (!edgePoints.contains(x, y)) {
        islands.push(new Island(mask, x, x, y + 1, y + 1))
        points.push({ x, y })
        mask.set(x, y, 1)
      }
    })

  return { islands, points }
}