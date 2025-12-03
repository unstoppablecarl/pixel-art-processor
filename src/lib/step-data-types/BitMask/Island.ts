import { Bounds } from '../../data/Bounds.ts'
import type { Point } from '../BaseDataStructure.ts'
import { BitMask } from '../BitMask.ts'

export enum IslandType {
  HORIZONTAL_EDGE = 'HORIZONTAL',
  VERTICAL_EDGE = 'VERTICAL',
  NORMAL = 'NORMAL'
}

const EDGE_INSET_RATIO = 0.2

export class Island {
  readonly frontier: Set<number> = new Set()
  readonly expandableBounds: Bounds
  readonly bounds: Bounds

  private maskWidth: number // cache
  private _expandable: Point[] | null = null // Cache for getExpandable()

  constructor(
    readonly mask: BitMask,
    readonly id: number,
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    readonly type: IslandType = IslandType.NORMAL,
  ) {
    if (minX > maxX || minY > maxY) throw new Error('Invalid bounds')
    this.maskWidth = this.mask.width // Cache fixed width
    this.bounds = mask.bounds.trimNewBounds(minX, maxX, minY, maxY)
    this.expandableBounds = new Bounds()
    this.updateExpandableBounds()
    this.initializeFrontier()
  }

  protected initializeFrontier() {
    this.mask.eachRect(this.bounds, (x, y, v) => {
      if (v === 1) {
        this.mask.eachAdjacent(x, y, (ax, ay, av) => {
          if (av === 0) {
            const id = ax + ay * this.maskWidth
            this.frontier.add(id)
          }
        })
      }
    })
  }

  protected expandBounds(x: number, y: number) {
    this.bounds.expand(x, y)
    this.updateExpandableBounds()
  }

  claimPoint(x: number, y: number) {
    this.expandBounds(x, y)

    const key = x + y * this.maskWidth
    this.frontier.delete(key)

    this.mask.eachAdjacent(x, y, (nx, ny, nv) => {
      if (nv === 0) {
        const nid = nx + ny * this.maskWidth
        this.frontier.add(nid)
      }
    })

    this._expandable = null
  }

  each(cb: (x: number, y: number, v: number) => void) {
    const bounds = this.bounds

    for (let y = bounds.minY; y < bounds.maxY; y++) {
      for (let x = bounds.minX; x < bounds.maxX; x++) {
        cb(x, y, this.mask.get(x, y))
      }
    }
  }

  protected updateExpandableBounds() {
    const bounds = this.bounds

    let minX = Math.max(bounds.minX - 1, 0)
    let maxX = Math.min(bounds.maxX + 1, this.mask.width)

    let minY = Math.max(bounds.minY - 1, 0)
    let maxY = Math.min(bounds.maxY + 1, this.mask.height)

    if (this.type === IslandType.HORIZONTAL_EDGE) {
      minX = bounds.minX + Math.floor(this.bounds.height * EDGE_INSET_RATIO)
      maxX = bounds.maxX - Math.floor(this.bounds.height * EDGE_INSET_RATIO)
    }

    if (this.type === IslandType.VERTICAL_EDGE) {
      minY = bounds.minY + Math.floor(this.bounds.width * EDGE_INSET_RATIO)
      maxY = bounds.maxY - Math.floor(this.bounds.width * EDGE_INSET_RATIO)
    }

    this.expandableBounds.minX = minX
    this.expandableBounds.minY = minY
    this.expandableBounds.maxX = maxX
    this.expandableBounds.maxY = maxY
    this.expandableBounds.trim(this.mask.bounds)
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
    withinBounds?: Bounds,
  ): Point[] {
    return this.getExpandable().filter(({ x, y }) => {
      return this.pointRespectsMinDistance(x, y, otherIslands, minDistance, withinBounds)
    })
  }

  pointRespectsMinDistance(
    x: number,
    y: number,
    otherIslands: Island[],
    minDistance: number,
    withinBounds?: Bounds,
  ): boolean {
    if (withinBounds && !withinBounds.contains(x, y)) return false

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
