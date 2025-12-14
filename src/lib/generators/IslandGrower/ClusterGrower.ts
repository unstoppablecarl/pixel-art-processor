import type { Point } from '../../step-data-types/BaseDataStructure.ts'
import type { IslandMutator } from '../IslandMutator.ts'

/**
 * Cluster Growth - Grows by expanding to nearby similar regions for cohesive blobs
 * Creates smoother shapes by clustering expansion points
 */
export function clusterGrower(clusterRadius: number = 3): IslandMutator {

  return (mask, islands, island, expandable, claim): void => {

    // Find clusters of adjacent expandable pixels
    const clusters: Point[][] = []
    const used = new Set<string>()

    for (const point of expandable) {
      const key = `${point.x},${point.y}`
      if (used.has(key)) continue

      const cluster = findCluster(point, expandable, clusterRadius, used)
      clusters.push(cluster)
    }

    // Grow from center of each cluster
    for (const cluster of clusters) {
      if (cluster.length === 0) continue
      const center = getClusterCenter(cluster)

      // Grow outward from cluster center - grow multiple pixels per cluster
      const toGrow = Math.max(1, Math.ceil(cluster.length * 0.5))
      const sorted = cluster
        .map(p => ({ p, d: Math.hypot(p.x - center.x, p.y - center.y) }))
        .sort((a, b) => a.d - b.d)

      for (let i = 0; i < toGrow && i < sorted.length; i++) {
        const { x, y } = sorted[i]!.p
        claim(x, y)
      }
    }
  }
}

function findCluster(start: Point, candidates: Point[], radius: number, used: Set<string>): Point[] {
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

function getClusterCenter(cluster: Point[]): Point {
  const sumX = cluster.reduce((sum, p) => sum + p.x, 0)
  const sumY = cluster.reduce((sum, p) => sum + p.y, 0)
  return {
    x: Math.round(sumX / cluster.length),
    y: Math.round(sumY / cluster.length),
  }
}
