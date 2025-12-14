import type { Point } from '../../step-data-types/BaseDataStructure.ts'
import type { Island } from '../../step-data-types/BitMask/Island.ts'
import { prng } from '../../util/prng.ts'

export function erodeIslandWeighted(island: Island, count: number): void {
  const weighted: Array<{ item: Point; weight: number }> = []

  island.getEdge().forEach(({ x, y }) => {

    const neighbors = island.mask.adjacentSum(x, y)
    // Lower neighbor count = higher erosion probability
    const weight = Math.pow(2, 8 - neighbors)
    weighted.push({ item: { x, y }, weight })

  })

  if (weighted.length === 0) return

  const erode = prng.weightedArrayTable(weighted)

  for (let i = 0; i < count; i++) {
    const point = erode()
    island.releasePoint(point.x, point.y)
  }
}