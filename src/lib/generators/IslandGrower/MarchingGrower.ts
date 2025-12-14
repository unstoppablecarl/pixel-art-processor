import type { Point } from '../../step-data-types/BaseDataStructure.ts'
import type { BitMask } from '../../step-data-types/BitMask.ts'
import { Island } from '../../step-data-types/BitMask/Island.ts'
import { prng } from '../../util/prng.ts'
import type { IslandMutator } from '../IslandMutator.ts'

/**
 * Marching Growth - Each island expands outward with consistent blob-like growth
 * Limits expansion per iteration for controlled growth rate
 */
export function marchingGrower(pixelsPerIteration: number = 8): IslandMutator {

  return (mask, islands, island, expandable, claim): void => {

    let grown = 0

    // Prioritize expansion around blob edges with good weight distribution
    const sorted = expandable
      .map(p => ({ p, dist: distanceToIslandEdge(mask, p, island) }))
      .sort(() => prng() - 0.5)

    for (const { p } of sorted) {
      if (grown >= pixelsPerIteration) break
      const { x, y } = p
      mask.set(x, y, 1)
      claim(x, y)
      grown++
    }
  }
}

function distanceToIslandEdge(mask: BitMask, point: Point, island: Island): number {
  let minDist = Infinity
  for (let y = island.bounds.minY; y < island.bounds.maxY; y++) {
    for (let x = island.bounds.minX; x < island.bounds.maxX; x++) {
      if (mask.get(x, y) === 1) {
        const dist = Math.hypot(point.x - x, point.y - y)
        minDist = Math.min(minDist, dist)
      }
    }
  }
  return minDist === Infinity ? 0 : minDist
}