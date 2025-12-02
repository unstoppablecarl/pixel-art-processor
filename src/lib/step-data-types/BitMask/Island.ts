import type { Point } from '../BaseDataStructure.ts'
import { BitMask } from '../BitMask.ts'

export enum IslandType {
  HORIZONTAL_EDGE = 'HORIZONTAL',
  VERTICAL_EDGE = 'VERTICAL',
  NORMAL = 'NORMAL'
}

export class Island {
  frontier: Set<string> = new Set() // "x,y"
  pixels: Set<string> = new Set() // all filled pixels in island

  constructor(
    readonly mask: BitMask,
    readonly id: number,
    public minX: number,
    public maxX: number,
    public minY: number,
    public maxY: number,
    readonly type: IslandType = IslandType.NORMAL,
  ) {
    this.initializeFrontier()
  }

  // call this once at creation time:
  initializeFrontier() {
    this.mask.eachRect(this.minX, this.maxX, this.minY, this.maxY, (x, y, v) => {
      if (v === 1) {
        this.frontier.add(`${x},${y}`)
      }
    })
  }

  // update when you claim (x,y)
  claimPixel(x: number, y: number) {
    this.updateBounds(x, y)
    const key = `${x},${y}`
    this.pixels.add(key)
    // remove claimed from frontier (if present)
    this.frontier.delete(key)

    // for each neighbor, if empty then add to frontier
    this.mask.eachAdjacent(x, y, (x, y, v) => {
      if (v === 0) {
        this.frontier.add(`${x},${y}`)
      }
    })
  }

  protected updateBounds(x: number, y: number): void {
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

  getExpandable(): Point[] {
    // convert frontier Set to Point[] once if needed
    return Array.from(this.frontier, s => {
      const [sx, sy] = s.split(',').map(Number)
      return { x: sx, y: sy }
    })
  }

  isAdjacentToAnyIslands(otherIslands: Island[], maxDistance: number): boolean {
    for (const otherIsland of otherIslands) {
      if (this.isAdjacentToIsland(otherIsland, maxDistance)) {
        return true
      }
    }
    return false
  }

  isAdjacentToIsland(otherIsland: Island, minDistance: number): boolean {
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
            if (dist <= minDistance) {
              return true
            }
          }
        }
      }
    }

    return false
  }
}
