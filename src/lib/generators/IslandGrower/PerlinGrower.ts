import type { BitMask } from '../../step-data-types/BitMask.ts'
import type { IslandMutator } from '../IslandMutator.ts'

export function perlinGrower(factor = 0.2): IslandMutator {
  return (mask: BitMask, islands, island, expandable, claim): void => {

    // Score based on local gradient (smoother transitions grow more)
    const scored = expandable.map(point => ({
      point,
      score: calculateGradientScore(mask, point.x, point.y),
    }))

    scored.sort((a, b) => b.score - a.score)
    const toGrow = Math.ceil(scored.length * factor)

    for (let i = 0; i < toGrow && i < scored.length; i++) {
      const { x, y } = scored[i]!.point
      claim(x, y)
    }
  }
}

function calculateGradientScore(mask: BitMask, x: number, y: number): number {
  // Smoother if surrounded by more island pixels
  let smooth = 0
  let visited = 0

  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
      const nx = x + dx
      const ny = y + dy
      if (!mask.inBounds(nx, ny)) continue
      visited++

      if (mask.get(nx, ny) === 1) {
        // Weight by distance - closer pixels matter more
        const dist = Math.hypot(dx, dy)
        smooth += 1 / (1 + dist)
      }
    }
  }

  return visited > 0 ? smooth / visited : 0
}
