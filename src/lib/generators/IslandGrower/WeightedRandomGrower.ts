import type { BitMask } from '../../step-data-types/BitMask.ts'
import { prng } from '../../util/prng.ts'
import type { IslandMutator } from '../IslandMutator.ts'

/**
 * Weighted Random Growth - Grows blobs with preference for expanding in smooth directions
 * Uses Perlin noise-like weighting to create natural flowing shapes
 */
export function weightedRandomGrower(): IslandMutator {

  return (mask, islands, island, expandable, claim): void => {

    // Weight candidates by smoothness (prefer expanding where already expanded)
    const weighted = expandable.map(point => ({
      point,
      weight: calculateSmoothness(mask, point.x, point.y),
    }))

    // Sort by weight descending, then randomly select from top candidates
    weighted.sort((a, b) => b.weight - a.weight)
    const topCandidates = weighted.slice(0, Math.max(1, Math.ceil(expandable.length * 0.3)))
    const selected = topCandidates[Math.floor(prng() * topCandidates.length)]!
    const { x, y } = selected.point
    claim(x, y)
  }
}

function calculateSmoothness(mask: BitMask, x: number, y: number): number {
  // Count how many adjacent pixels belong to this island
  let count = 0
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue
      const nx = x + dx
      const ny = y + dy
      if (mask.inBounds(nx, ny) && mask.get(nx, ny) === 1) {
        count++
      }
    }
  }
  return count
}
