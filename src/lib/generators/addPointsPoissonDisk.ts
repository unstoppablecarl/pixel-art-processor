import PoissonDiskSampling from 'poisson-disk-sampling'
import { PointSet } from '../data/PointSet.ts'
import type { Point } from '../step-data-types/BaseDataStructure.ts'
import type { BitMask } from '../step-data-types/BitMask.ts'
import { prng } from '../util/prng.ts'

export function addPointsPoissonDisk(
  mask: BitMask,
  minDistance = 15,
  maxDistance = 30,
  tries = 30,
) {

  let { width, height } = mask

  const p = new PoissonDiskSampling({
    shape: [
      width,
      height,
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
      if (existingPoints.contains(x, y)) return

      points.push({ x, y })
    })

  return points
}