import { BitMask } from '../../step-data-types/BitMask.ts'
import type { Island, IslandPointFilter } from '../../step-data-types/BitMask/Island.ts'

export function smoothIslandsGaussian(
  islands: Island[],
  iterations: number = 1,
  pointFilter?: IslandPointFilter,
): void {
  for (let i = 0; i < islands.length; i++) {
    smoothIslandGaussian(islands[i], iterations, pointFilter)
  }
}

export function smoothIslandGaussian(
  island: Island,
  iterations: number = 1,
  pointFilter?: IslandPointFilter,
): void {
  const mask = island.mask

  for (let iter = 0; iter < iterations; iter++) {
    const temp = new BitMask(mask.width, mask.height)

    // Copy all pixels from mask
    for (let y = 0; y < mask.height; y++) {
      for (let x = 0; x < mask.width; x++) {
        temp.set(x, y, mask.get(x, y))
      }
    }

    // Apply smoothing only within island bounds and to pixels that pass the filter
    for (let y = island.bounds.minY; y < island.bounds.maxY; y++) {
      for (let x = island.bounds.minX; x < island.bounds.maxX; x++) {
        const value = mask.get(x, y)

        // Skip if filter returns false
        if (pointFilter && !pointFilter(x, y, island)) {
          continue
        }

        // Calculate weighted neighbor sum (closer = stronger weight)
        let weightedSum = 0
        let totalWeight = 0

        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            if (dx === 0 && dy === 0) continue

            const nx = x + dx
            const ny = y + dy
            if (!mask.inBounds(nx, ny)) continue

            // Gaussian-like weight: closer pixels matter more
            const distSq = dx * dx + dy * dy
            const weight = Math.exp(-distSq / 2)

            weightedSum += mask.get(nx, ny) * weight
            totalWeight += weight
          }
        }

        // Smooth: set to 1 if weighted average > 0.5
        const average = totalWeight > 0 ? weightedSum / totalWeight : value
        temp.set(x, y, average > 0.5 ? 1 : 0)
      }
    }

    // Copy temp back to mask
    for (let y = island.bounds.minY; y < island.bounds.maxY; y++) {
      for (let x = island.bounds.minX; x < island.bounds.maxX; x++) {
        mask.set(x, y, temp.get(x, y))
      }
    }
  }
}