
import { ADJACENT_DIRECTIONS, type Point } from '../step-data-types/BaseDataStructure.ts'
import { Island } from '../data/Island.ts'
import { BitMask } from '../step-data-types/BitMask.ts'
import { getRandomFloatRange, prng, randomArrayValue } from '../util/prng.ts'

export class BlobGrower {

  constructor(
    private mask: BitMask,
    private islands: Island[],
    private minDistance: number = 4,
    private doneIslands = new WeakSet<Island>(),
  ) {
  }

  /**
   * Weighted Random Growth - Grows blobs with preference for expanding in smooth directions
   * Uses Perlin noise-like weighting to create natural flowing shapes
   */
  weightedRandomGrowth(iterations: number): void {
    this.iterateIslands(iterations, (island) => {

      const expandable = island.getExpandable()
      if (expandable.length === 0) return

      // Weight candidates by smoothness (prefer expanding where already expanded)
      const weighted = expandable.map(point => ({
        point,
        weight: this.calculateSmoothness(point.x, point.y),
      }))

      // Sort by weight descending, then randomly select from top candidates
      weighted.sort((a, b) => b.weight - a.weight)
      const topCandidates = weighted.slice(0, Math.max(1, Math.ceil(expandable.length * 0.3)))
      const selected = topCandidates[Math.floor(prng() * topCandidates.length)]!

      if (this.isValidExpansion(selected.point, island)) {
        const { x, y } = selected.point

        this.mask.set(x, y, 1)
        island.updateBounds(x, y)
      }
    })
  }

  /**
   * Marching Growth - Each island expands outward with consistent blob-like growth
   * Limits expansion per iteration for controlled growth rate
   */
  marchingGrowth(iterations: number, pixelsPerIteration: number = 8): void {
    this.iterateIslands(iterations, (island) => {

      let grown = 0
      const expandable = island.getExpandable()

      // Prioritize expansion around blob edges with good weight distribution
      const sorted = expandable
        .map(p => ({ p, dist: this.distanceToIslandEdge(p, island) }))
        .sort(() => prng() - 0.5)

      for (const { p } of sorted) {
        if (grown >= pixelsPerIteration) break
        if (this.isValidExpansion(p, island)) {
          const { x, y } = p
          this.mask.set(x, y, 1)
          island.updateBounds(x, y)
          grown++
        }
      }
    })
  }

  /**
   * Directional Growth - Grows in preferred directions to create more organic shapes
   * Uses directional bias to create elongated, natural-looking blobs
   */
  directionalGrowth(iterations: number): void {
    const islands = this.islands
    const islandDirections = new Map<Island, [number, number]>()

    for (const island of islands) {
      islandDirections.set(island, randomArrayValue(ADJACENT_DIRECTIONS))
    }

    this.iterateIslands(iterations, (island) => {

      const [prefDx, prefDy] = islandDirections.get(island)!
      const expandable = island.getExpandable()

      // Sort by alignment with preferred direction
      const sorted = expandable.sort((a, b) => {
        const aDist = Math.abs(a.x - island.minX - prefDx) + Math.abs(a.y - island.minY - prefDy)
        const bDist = Math.abs(b.x - island.minX - prefDx) + Math.abs(b.y - island.minY - prefDy)
        return aDist - bDist
      })

      // Expand in preferred direction with some randomness
      const toExpand = Math.ceil(expandable.length * 0.15)
      for (let i = 0; i < toExpand && i < sorted.length; i++) {
        if (this.isValidExpansion(sorted[i]!, island)) {
          const { x, y } = sorted[i]!
          this.mask.set(x, y, 1)
          island.updateBounds(x, y)
        }
      }
    })
  }

  /**
   * Cluster Growth - Grows by expanding to nearby similar regions for cohesive blobs
   * Creates smoother shapes by clustering expansion points
   */
  clusterGrowth(iterations: number, clusterRadius: number = 3): void {
    this.iterateIslands(iterations, (island) => {

      const expandable = island.getExpandable()
      if (expandable.length === 0) return

      // Find clusters of adjacent expandable pixels
      const clusters: Point[][] = []
      const used = new Set<string>()

      for (const point of expandable) {
        const key = `${point.x},${point.y}`
        if (used.has(key)) continue

        const cluster = this.findCluster(point, expandable, clusterRadius, used)
        clusters.push(cluster)
      }

      // Grow from center of each cluster
      for (const cluster of clusters) {
        if (cluster.length === 0) continue
        const center = this.getClusterCenter(cluster)

        // Grow outward from cluster center - grow multiple pixels per cluster
        const toGrow = Math.max(1, Math.ceil(cluster.length * 0.5))
        const sorted = cluster
          .map(p => ({ p, d: Math.hypot(p.x - center.x, p.y - center.y) }))
          .sort((a, b) => a.d - b.d)

        for (let i = 0; i < toGrow && i < sorted.length; i++) {
          if (this.isValidExpansion(sorted[i]!.p, island)) {
            const { x, y } = sorted[i]!.p
            this.mask.set(x, y, 1)
            island.updateBounds(x, y)
          }
        }
      }
    })
  }

  /**
   * Perlin-like Growth - Uses gradient-based smoothing for very natural blob shapes
   * Treats blob growth like a diffusion process
   */
  perlinLikeGrowth(iterations: number): void {
    this.iterateIslands(iterations, (island) => {

      const expandable = island.getExpandable()
      if (expandable.length === 0) return

      // Score based on local gradient (smoother transitions grow more)
      const scored = expandable.map(point => ({
        point,
        score: this.calculateGradientScore(point.x, point.y),
      }))

      scored.sort((a, b) => b.score - a.score)
      const toGrow = Math.ceil(scored.length * 0.2)

      for (let i = 0; i < toGrow && i < scored.length; i++) {
        if (this.isValidExpansion(scored[i]!.point, island)) {
          const { x, y } = scored[i]!.point
          this.mask.set(x, y, 1)
          island.updateBounds(x, y)
        }
      }
    })
  }

  private iterateIslands(iterations: number, cb: (island: Island) => void) {
    const skipChance = new WeakMap<Island, number>()

    for (const island of this.islands) {
      skipChance.set(island, getRandomFloatRange(0.2, 1))
    }

    for (let iter = 0; iter < iterations; iter++) {
      for (const island of this.islands) {

        if (this.doneIslands.has(island)) continue
        if (island.isAdjacentToAnyIslands(this.islands, this.minDistance)) {

          this.doneIslands.add(island)

          continue
        }
        if (prng() < skipChance.get(island)!)
          cb(island)
      }
    }
  }

  // Helper methods

  private calculateSmoothness(x: number, y: number): number {
    // Count how many adjacent pixels belong to this island
    let count = 0
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue
        const nx = x + dx
        const ny = y + dy
        if (this.mask.inBounds(nx, ny) && this.mask.get(nx, ny) === 1) {
          count++
        }
      }
    }
    return count
  }

  private calculateGradientScore(x: number, y: number): number {
    // Smoother if surrounded by more island pixels
    let smooth = 0
    let visited = 0

    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        const nx = x + dx
        const ny = y + dy
        if (!this.mask.inBounds(nx, ny)) continue
        visited++

        if (this.mask.get(nx, ny) === 1) {
          // Weight by distance - closer pixels matter more
          const dist = Math.hypot(dx, dy)
          smooth += 1 / (1 + dist)
        }
      }
    }

    return visited > 0 ? smooth / visited : 0
  }

  private distanceToIslandEdge(point: Point, island: Island): number {
    let minDist = Infinity
    for (let y = island.minY; y < island.maxY; y++) {
      for (let x = island.minX; x < island.maxX; x++) {
        if (this.mask.get(x, y) === 1) {
          const dist = Math.hypot(point.x - x, point.y - y)
          minDist = Math.min(minDist, dist)
        }
      }
    }
    return minDist === Infinity ? 0 : minDist
  }

  private isValidExpansion(point: Point, currentIsland: Island): boolean {
    // Check minimum distance from OTHER islands only
    const islands = this.islands
    for (const island of islands) {
      if (island === currentIsland) continue
      if (this.distanceToPoint(point, island) < this.minDistance) {
        return false
      }
    }
    return true
  }

  private distanceToPoint(point: Point, island: Island): number {
    let minDist = Infinity
    for (let y = island.minY; y < island.maxY; y++) {
      for (let x = island.minX; x < island.maxX; x++) {
        if (this.mask.get(x, y) === 1) {
          const dist = Math.hypot(point.x - x, point.y - y)
          minDist = Math.min(minDist, dist)
        }
      }
    }
    return minDist === Infinity ? Infinity : minDist
  }

  private findCluster(start: Point, candidates: Point[], radius: number, used: Set<string>): Point[] {
    const cluster: Point[] = []
    const queue = [start]
    const visited = new Set<string>()

    while (queue.length > 0) {
      const current = queue.shift()!
      const key = `${current.x},${current.y}`

      if (visited.has(key)) continue
      visited.add(key)
      used.add(key)

      cluster.push(current)

      for (const candidate of candidates) {
        const cKey = `${candidate.x},${candidate.y}`
        if (visited.has(cKey)) continue

        const dist = Math.hypot(candidate.x - current.x, candidate.y - current.y)
        if (dist <= radius) {
          queue.push(candidate)
        }
      }
    }

    return cluster
  }

  private getClusterCenter(cluster: Point[]): Point {
    const sumX = cluster.reduce((sum, p) => sum + p.x, 0)
    const sumY = cluster.reduce((sum, p) => sum + p.y, 0)
    return {
      x: Math.round(sumX / cluster.length),
      y: Math.round(sumY / cluster.length),
    }
  }
}