import { BitMask } from '../step-data-types/BitMask.ts'
import { PointSet } from './PointSet.ts'

export enum IslandType {
  HORIZONTAL_EDGE = 'HORIZONTAL',
  VERTICAL_EDGE = 'VERTICAL',
  NORMAL = 'NORMAL'
}

export class Island {
  constructor(
    readonly mask: BitMask,
    public minX: number,
    public maxX: number,
    public minY: number,
    public maxY: number,
    readonly type: IslandType = IslandType.NORMAL,
  ) {

  }

  updateBounds(x: number, y: number): void {
    if (x < this.minX) this.minX = x
    if (x + 1 > this.maxX) this.maxX = x + 1
    if (y < this.minY) this.minY = y
    if (y + 1 > this.maxY) this.maxY = y + 1
  }

  get height() {
    return this.maxY - this.minY
  }

  get width() {
    return this.maxX - this.minX
  }

  each(cb: (x: number, y: number, v: number) => void) {
    for (let y = this.minY; y < this.maxY; y++) {
      for (let x = this.minX; x < this.maxX; x++) {
        cb(x, y, this.mask.get(x, y))
      }
    }
  }

  getExpandableBounds() {
    let minX = this.minX - 1
    if (minX < 0) {
      minX = 0
    }

    let maxX = this.maxX + 1
    if (maxX > this.mask.width) {
      maxX = this.mask.width
    }

    let minY = this.minY - 1
    if (minY < 0) {
      minY = 0
    }

    let maxY = this.maxY + 1
    if (maxY > this.mask.height) {
      maxY = this.mask.height
    }

    if (this.type === IslandType.HORIZONTAL_EDGE) {
      minX = this.minX
      maxX = this.maxX
    }

    if (this.type === IslandType.VERTICAL_EDGE) {
      minY = this.minY
      maxY = this.maxY
    }

    if (this.type === IslandType.HORIZONTAL_EDGE) {
      minX = this.minX + Math.floor(this.height * 0.2)
      maxX = this.maxX - Math.floor(this.height * 0.2)
    }

    if (this.type === IslandType.VERTICAL_EDGE) {
      minY = this.minY + Math.floor(this.width * 0.2)
      maxY = this.maxY - Math.floor(this.width * 0.2)
    }

    return this.mask.bounds.trim(
      minX,
      maxX,
      minY,
      maxY,
    )
  }

  getExpandable() {
    const bounds = this.getExpandableBounds()

    let {
      minX,
      minY,
      maxX,
      maxY,
    } = bounds

    let result = new PointSet()
    for (let y = minY; y < maxY; y++) {
      for (let x = minX; x < maxX; x++) {
        const value = this.mask.get(x, y)
        if (value === 1) {
          const adjacent = this.mask.filterAdjacent(x, y, 0, bounds)

          result.addMultiple(adjacent)
        }
      }
    }
    return result.toArray()
  }

  isAdjacentToAnyIslands(otherIslands: Island[], maxDistance: number): boolean {
    for (const otherIsland of otherIslands) {
      if (this.isAdjacentToIsland(otherIsland, maxDistance)) {
        return true
      }
    }
    return false
  }

  isAdjacentToIsland(otherIsland: Island, maxDistance: number): boolean {
    if (otherIsland === this) return false

    // Iterate through all pixels within this island with value 1
    for (let y = this.minY; y < this.maxY; y++) {
      for (let x = this.minX; x < this.maxX; x++) {
        if (this.mask.get(x, y) !== 1) continue

        // Check distance to all pixels within the other island with value 1
        for (let oy = otherIsland.minY; oy < otherIsland.maxY; oy++) {
          for (let ox = otherIsland.minX; ox < otherIsland.maxX; ox++) {
            if (this.mask.get(ox, oy) !== 1) continue

            const dist = Math.hypot(x - ox, y - oy)
            if (dist <= maxDistance) {
              return true
            }
          }
        }
      }
    }

    return false
  }
}
