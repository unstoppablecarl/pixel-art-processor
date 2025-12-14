import type { Point } from '../../step-data-types/BaseDataStructure.ts'
import { prng } from '../../util/prng.ts'
import type { IslandMutator } from '../IslandMutator.ts'

export function islandEroderWeighted(factor: number): IslandMutator {

  return (mask, islands, island, points, claim, release): void => {

    const weighted: Array<{ item: Point; weight: number }> = []

    points.forEach(({ x, y }) => {
      const neighbors = mask.adjacentSum(x, y)
      // Lower neighbor count = higher erosion probability
      const weight = Math.pow(2, 8 - neighbors)
      weighted.push({ item: { x, y }, weight })
    })
    if (weighted.length === 0) return

    const count = Math.floor(points.length * factor)
    const erode = prng.weightedArrayItems(count, weighted)

    for (let i = 0; i < erode.length; i++) {
      const point = erode[i]
      release(point.x, point.y)
    }
  }
}