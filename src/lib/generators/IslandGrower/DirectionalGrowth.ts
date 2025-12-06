import { ADJACENT_DIRECTIONS } from '../../step-data-types/BaseDataStructure.ts'
import type { Island } from '../../step-data-types/BitMask/Island.ts'
import { prng } from '../../util/prng.ts'
import type { IslandIterator } from '../IslandIterator.ts'

/**
 * Directional Growth - Grows in preferred directions to create more organic shapes
 * Uses directional bias to create elongated, natural-looking blobs
 */
export function directionalGrower(): IslandIterator {

  const islandDirections = new Map<Island, [number, number]>()

  return (mask, islands, island, expandable, claim): void => {

    let dir = islandDirections.get(island)!
    if (!dir) {
      dir = prng.randomArrayValue(ADJACENT_DIRECTIONS)
      islandDirections.set(island, dir)
    }

    const [prefDx, prefDy] = dir
    // Sort by alignment with preferred direction
    const sorted = expandable.sort((a, b) => {
      const aDist = Math.abs(a.x - island.bounds.minX - prefDx) + Math.abs(a.y - island.bounds.minY - prefDy)
      const bDist = Math.abs(b.x - island.bounds.minX - prefDx) + Math.abs(b.y - island.bounds.minY - prefDy)
      return aDist - bDist
    })

    // Expand in preferred direction with some randomness
    const toExpand = Math.ceil(expandable.length * 0.15)
    for (let i = 0; i < toExpand && i < sorted.length; i++) {
      const { x, y } = sorted[i]!
      claim(x, y)
    }
  }
}