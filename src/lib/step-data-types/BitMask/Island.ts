import { Bounds } from '../../data/Bounds.ts'
import type { Point } from '../BaseDataStructure.ts'
import { BitMask } from '../BitMask.ts'

export enum IslandType {
  NORMAL = 1 << 0,
  TOP_EDGE = 1 << 1,
  BOTTOM_EDGE = 1 << 2,
  LEFT_EDGE = 1 << 3,
  RIGHT_EDGE = 1 << 4,
  HORIZONTAL_EDGE = IslandType.TOP_EDGE | IslandType.BOTTOM_EDGE,
  VERTICAL_EDGE = IslandType.LEFT_EDGE | IslandType.RIGHT_EDGE,
  EDGE = IslandType.TOP_EDGE | IslandType.BOTTOM_EDGE | IslandType.LEFT_EDGE | IslandType.RIGHT_EDGE,
}

export type AssignableIslandType = IslandType.NORMAL
  | IslandType.TOP_EDGE
  | IslandType.BOTTOM_EDGE
  | IslandType.LEFT_EDGE
  | IslandType.RIGHT_EDGE

export const isIslandType = (type: IslandType, match: IslandType) => {
  return (type & match) !== 0
}

const GROW_RATIO = 0.5

export type IslandPointFilter = (x: number, y: number, island: Island) => boolean
export type IslandFilter = (island: Island, index?: number | undefined) => boolean

export class Island {
  readonly frontier: Set<number> = new Set()
  readonly expandableBounds: Bounds
  readonly bounds: Bounds
  readonly initialBounds: Bounds

  private maskWidth: number // cache
  private _expandable: Point[] | null = null // Cache for getExpandable()

  constructor(
    readonly mask: BitMask,
    readonly id: number,
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    readonly type: AssignableIslandType = IslandType.NORMAL,
  ) {
    if (minX > maxX || minY > maxY) throw new Error('Invalid bounds')
    this.maskWidth = this.mask.width // Cache fixed width
    this.bounds = mask.bounds.trimNewBounds({ minX, maxX, minY, maxY })
    this.initialBounds = this.bounds.copy()
    this.expandableBounds = new Bounds()
    this.updateExpandableBounds()
    this.initializeFrontier()
  }

  protected initializeFrontier() {
    this.mask.eachRect(this.bounds, (x, y, v) => {
      if (v === 1) {
        if (this.isValidExpansion(x, y)) {
          this.mask.eachAdjacent(x, y, (ax, ay, av) => {
            if (av === 0) {
              const id = ax + ay * this.maskWidth
              this.frontier.add(id)
            }
          })
        }
      }
    })
  }

  protected expandBounds(x: number, y: number) {
    this.bounds.expand(x, y)
    this.updateExpandableBounds()
  }

  claimPoint(x: number, y: number) {
    this.mask.set(x, y, 1)
    this.expandBounds(x, y)

    const id = x + y * this.maskWidth
    this.frontier.delete(id)

    this.mask.eachAdjacent(x, y, (nx, ny, v) => {
      if (v === 0) {
        if (this.isValidExpansion(nx, ny)) {
          const nid = nx + ny * this.maskWidth
          this.frontier.add(nid)
        }
      }
    })

    this._expandable = null
  }

  releasePoint(x: number, y: number) {
    this.mask.set(x, y, 0)

    // Recalculate bounds if this was an edge point
    if (x === this.bounds.minX || x === this.bounds.maxX - 1 ||
      y === this.bounds.minY || y === this.bounds.maxY - 1) {
      this.recalculateBounds()
      this.updateExpandableBounds()
    }

    // Add this point to the frontier since it's now empty and adjacent to the island
    const id = x + y * this.maskWidth
    this.frontier.add(id)

    // Check adjacent points - remove them from frontier if they're no longer
    // adjacent to any empty spaces
    this.mask.eachAdjacent(x, y, (nx, ny, v) => {
      if (v === 1) {
        const nid = nx + ny * this.maskWidth
        // Check if this adjacent point is still next to any empty space
        const hasEmptyNeighbor = this.mask.hasAdjacent(nx, ny, (ax, ay, av) => {
          return av === 0 && this.isValidExpansion(ax, ay)
        })
        if (!hasEmptyNeighbor) {
          this.frontier.delete(nid)
        }
      }
    })

    this._expandable = null
  }

  protected recalculateBounds() {
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity

    this.mask.eachRect(this.bounds, (x, y, v) => {
      if (v === 1) {
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x + 1)
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y + 1)
      }
    })

    if (minX !== Infinity) {
      this.bounds.minX = minX
      this.bounds.maxX = maxX
      this.bounds.minY = minY
      this.bounds.maxY = maxY
    }
  }

  each(cb: (x: number, y: number, v: number) => void) {
    const bounds = this.bounds

    for (let y = bounds.minY; y < bounds.maxY; y++) {
      for (let x = bounds.minX; x < bounds.maxX; x++) {
        cb(x, y, this.mask.get(x, y))
      }
    }
  }

  protected isValidExpansion(x: number, y: number): boolean {
    if (this.type == IslandType.NORMAL) return true

    return this.expandableBounds.contains(x, y)
  }

  protected updateExpandableBounds() {
    if (this.type == IslandType.NORMAL) return true

    let minX = this.initialBounds.minX
    let maxX = this.initialBounds.maxX
    let minY = this.initialBounds.minY
    let maxY = this.initialBounds.maxY

    if (this.type === IslandType.LEFT_EDGE) {
      maxX = this.initialBounds.minX + this.initialBounds.height * GROW_RATIO
    }

    if (this.type === IslandType.RIGHT_EDGE) {
      minX = this.initialBounds.maxX - this.initialBounds.height * GROW_RATIO
    }

    if (this.type === IslandType.TOP_EDGE) {
      maxY = this.initialBounds.minY + this.initialBounds.width * GROW_RATIO
    }

    if (this.type === IslandType.BOTTOM_EDGE) {
      minY = this.initialBounds.maxY - this.initialBounds.width * GROW_RATIO
    }

    // never grow wider
    const isHorizontalEdge = (this.type & IslandType.HORIZONTAL_EDGE) !== 0
    if (isHorizontalEdge) {
      minX = this.initialBounds.minX + 1
      maxX = this.initialBounds.maxX - 1
    }

    // never grow taller
    const isVerticalEdge = (this.type & IslandType.VERTICAL_EDGE) !== 0
    if (isVerticalEdge) {
      minY = this.initialBounds.minY + 1
      maxY = this.initialBounds.maxY - 1
    }

    // if (__DEV__) {
    //   if (isNaN(minX) || isNaN(maxX) || isNaN(minY) || isNaN(maxY)) {
    //     console.error('invalid island expandable bounds', minX, maxX, minY, maxY)
    //     throw new Error('invalid island expandable bounds')
    //   }
    // }

    this.expandableBounds.minX = minX
    this.expandableBounds.minY = minY
    this.expandableBounds.maxX = maxX
    this.expandableBounds.maxY = maxY
    // not sure if needed
    // this.expandableBounds.trim(this.mask.bounds)
  }

  getExpandable(): Point[] {
    if (this._expandable === null) {
      this._expandable = Array.from(this.frontier, id => {
        const x = id % this.maskWidth
        const y = Math.floor(id / this.maskWidth)
        return { x, y }
      })
    }
    return this._expandable
  }

  getExpandableRespectingMinDistance(
    otherIslands: Island[],
    minDistance: number,
    islandFilter?: IslandFilter,
    pointFilter?: IslandPointFilter,
  ): Point[] {
    return this.getExpandable().filter(({ x, y }) => {
      if (islandFilter && !islandFilter(this)) return

      return this.pointRespectsMinDistance(x, y, otherIslands, minDistance, pointFilter)
    })
  }

  pointRespectsMinDistance(
    x: number,
    y: number,
    otherIslands: Island[],
    minDistance: number,
    pointFilter?: IslandPointFilter,
  ): boolean {
    if (pointFilter && !pointFilter(x, y, this)) return false

    for (const otherIsland of otherIslands) {
      if (otherIsland === this) continue
      if (!this.pointRespectsMinDistanceToIsland(x, y, otherIsland, minDistance)) return false
    }
    return true
  }

  pointRespectsMinDistanceToIsland(x: number, y: number, otherIsland: Island, minDistance: number): boolean {
    if (otherIsland === this) return true

    const minDistSq = minDistance * minDistance
    const expandable = otherIsland.getExpandable()
    for (let i = 0; i < expandable.length; i++) {
      const p = expandable[i]
      const dx = x - p.x
      const dy = y - p.y
      const distSq = dx * dx + dy * dy
      if (distSq < minDistSq) {
        return false
      }
    }
    return true
  }
}
