import { type Bit, BitMask } from '../step-data-types/BitMask.ts'
import type { Island } from '../step-data-types/BitMask/Island.ts'

export function growIsland(island: Island, radius: number = 1): void {
  // Collect current island points for fast lookup
  const originalPoints = new Set<string>()
  island.each((x: number, y: number, v: number) => {
    if (v === 1) {
      originalPoints.add(`${x},${y}`)
    }
  })

  // Step: Dilation - expand by adding all points within the disk radius of original points
  const newPoints = new Set<string>()
  const r2 = radius * radius

  originalPoints.forEach(key => {
    const [cx, cy] = key.split(',').map(Number) as [cx: number, cy: number]

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        // Approximate disk with Euclidean distance for smooth rounding
        if (dx * dx + dy * dy > r2) continue

        const nx = cx + dx
        const ny = cy + dy
        if (island.mask.inBounds(nx, ny) && !originalPoints.has(`${nx},${ny}`)) {
          newPoints.add(`${nx},${ny}`)
        }
      }
    }
  })

  // Set the new boundary points to 1 in the mask
  newPoints.forEach(key => {
    const [x, y] = key.split(',').map(Number) as [x: number, y: number]
    island.mask.set(x, y, 1)
  })
}

export function smoothMaskBasic(
  mask: BitMask,
  iterations: number = 1,
  shouldSmooth?: (x: number, y: number, value: Bit) => boolean,
): void {
  for (let iter = 0; iter < iterations; iter++) {
    const temp = new BitMask(mask.width, mask.height)

    // Copy all pixels
    for (let y = 0; y < mask.height; y++) {
      for (let x = 0; x < mask.width; x++) {
        temp.set(x, y, mask.get(x, y))
      }
    }

    // Apply smoothing only to pixels that pass the filter
    for (let y = 0; y < mask.height; y++) {
      for (let x = 0; x < mask.width; x++) {
        const value = mask.get(x, y)

        // Skip if filter returns false
        if (shouldSmooth && !shouldSmooth(x, y, value)) {
          continue
        }

        // Count neighbors
        let count = 0
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue
            const nx = x + dx
            const ny = y + dy
            if (mask.inBounds(nx, ny)) {
              count += mask.get(nx, ny)
            }
          }
        }

        // Smooth: set to 1 if mostly surrounded by 1s
        const threshold = 4
        if (count >= threshold) {
          temp.set(x, y, 1)
        } else {
          temp.set(x, y, 0)
        }
      }
    }

    // Copy temp back to mask
    for (let y = 0; y < mask.height; y++) {
      for (let x = 0; x < mask.width; x++) {
        mask.set(x, y, temp.get(x, y))
      }
    }
  }
}

export function smoothIslandGaussian(
  island: Island,
  iterations: number = 1,
  shouldSmooth?: (x: number, y: number, value: Bit) => boolean,
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
    for (let y = island.minY; y < island.maxY; y++) {
      for (let x = island.minX; x < island.maxX; x++) {
        const value = mask.get(x, y)

        // Skip if filter returns false
        if (shouldSmooth && !shouldSmooth(x, y, value)) {
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
    for (let y = island.minY; y < island.maxY; y++) {
      for (let x = island.minX; x < island.maxX; x++) {
        mask.set(x, y, temp.get(x, y))
      }
    }
  }
}

export function smoothIsland(island: Island, radius: number = 1): void {
  // Collect current island points for fast lookup
  const originalPoints = new Set<string>()
  island.each((x: number, y: number, v: number) => {
    if (v === 1) {
      originalPoints.add(`${x},${y}`)
    }
  })

  // Clear the original island from the mask
  originalPoints.forEach(key => {
    const [x, y] = key.split(',').map(Number) as [x: number, y: number]
    island.mask.set(x, y, 0)
  })

  // Step 1: Erosion - keep only points where the entire disk struct element is covered by original points
  const erodedPoints = new Set<string>()
  const r2 = radius * radius
  originalPoints.forEach(key => {
    const [cx, cy] = key.split(',').map(Number) as [x: number, y: number]
    let fullyCovered = true

    for (let dy = -radius; dy <= radius && fullyCovered; dy++) {
      for (let dx = -radius; dx <= radius && fullyCovered; dx++) {
        // Approximate disk with Euclidean distance
        if (dx * dx + dy * dy > r2) continue

        const nx = cx + dx
        const ny = cy + dy

        if (!island.mask.inBounds(nx, ny) || !originalPoints.has(`${nx},${ny}`)) {
          fullyCovered = false
        }
      }
    }

    if (fullyCovered) {
      const isEdge = (cx === 0 || cx === island.mask.width - 1) || (cy === 0 || cy === island.mask.height - 1)
      if (isEdge) {
        return
      }
      erodedPoints.add(key)
    }
  })

  // Step 2: Dilation - expand eroded points with the disk struct element
  const smoothedPoints = new Set<string>()
  erodedPoints.forEach(key => {
    const [cx, cy] = key.split(',').map(Number) as [x: number, y: number]

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        // Approximate disk with Euclidean distance
        if (dx * dx + dy * dy > r2) continue

        const nx = cx + dx
        const ny = cy + dy
        if (island.mask.inBounds(nx, ny)) {
          smoothedPoints.add(`${nx},${ny}`)
        }
      }
    }
  })

  // Set the smoothed points back to 1 in the mask
  smoothedPoints.forEach(key => {
    const [x, y] = key.split(',').map(Number) as [x: number, y: number]
    island.mask.set(x, y, 1)
  })
}
