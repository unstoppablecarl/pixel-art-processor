import type { BoundsLike } from '../data/Bounds.ts'
import { eachImageDataPixel, type RGBA, updateImageData } from '../util/ImageData.ts'
import { BaseDataStructure, CARDINAL_DIRECTIONS, type Point } from './BaseDataStructure.ts'
import { Island } from './BitMask/Island.ts'

export type Bit = 0 | 1

export enum IslandType {
  HORIZONTAL_EDGE = 'HORIZONTAL',
  VERTICAL_EDGE = 'VERTICAL',
  NORMAL = 'NORMAL'
}

export class BitMask extends BaseDataStructure<Bit, Uint8Array<ArrayBufferLike>> {
  readonly __brand = 'BitMask'
  static displayName = 'BitMask'

  protected readonly canUseDirectAccess = false

  constructor(width: number, height: number, data?: Uint8Array) {
    super(width, height, data)
  }

  protected initData(width: number, height: number): Uint8Array {
    const totalBits = width * height
    const byteCount = Math.ceil(totalBits / 8)

    return new Uint8Array(byteCount)
  }

  get(x: number, y: number): Bit {
    const i = y * this.width + x
    const byteIndex = i >> 3
    const mask = 1 << (i & 7)
    return (this.data[byteIndex]! & mask) !== 0 ? 1 : 0
  }

  set(x: number, y: number, value: Bit): void {
    const i = y * this.width + x
    const byteIndex = i >> 3
    const mask = 1 << (i & 7)
    if (value) {
      this.data[byteIndex]! |= mask
    } else {
      this.data[byteIndex]! &= ~mask
    }
  }

  copy(): this {
    const clone = new BitMask(this.width, this.height) as this
    // efficient copy (works for Uint8Array or Uint8ClampedArray)
    clone.data.set(this.data)
    return clone
  }

  protected getRaw(idx: number): Bit {
    const byteIndex = idx >> 3
    const mask = 1 << (idx & 7)
    return (this.data[byteIndex]! & mask) !== 0 ? 1 : 0
  }

  protected setRaw(idx: number, value: Bit): void {
    const byteIndex = idx >> 3
    const mask = 1 << (idx & 7)
    if (value) {
      this.data[byteIndex]! |= mask
    } else {
      this.data[byteIndex]! &= ~mask
    }
  }

  toImageData(valueToColor?: ((value: Bit) => RGBA)): ImageData;
  toImageData(color1?: RGBA, color0?: RGBA): ImageData;

  toImageData(
    valueToColor: ((value: Bit) => RGBA) | RGBA = {
      r: 255,
      g: 255,
      b: 255,
      a: 255,
    },
    colorB: RGBA = {
      r: 0,
      g: 0,
      b: 0,
      a: 0,
    },
  ): ImageData {

    if (typeof valueToColor === 'function') {
      return this.generateImageData(valueToColor)
    }
    const colorA = valueToColor

    const result = new ImageData(this.width, this.height)
    updateImageData(result, (x, y) => {
      if (this.get(x, y)) {
        return colorA
      } else {
        return colorB
      }
    })

    return result
  }

  draw(canvas: HTMLCanvasElement, color: string): void {
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = color
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.get(x, y) === 1) {
          ctx.fillRect(x, y, 1, 1)
        }
      }
    }
  }

  static fromImageData(imageData: ImageData) {
    const result = new BitMask(imageData.width, imageData.height)
    eachImageDataPixel(imageData, (x, y, color) => {
      if (color.a > 0) {
        result.set(x, y, 1)
      }
    })

    return result
  }

  private getIslandType(minY: number, maxY: number, minX: number, maxX: number) {
    let type = IslandType.NORMAL
    if (minY === 0 && maxY === 1) {
      type = IslandType.HORIZONTAL_EDGE
    }

    if (minY === this.height - 1 && maxY === this.height) {
      type = IslandType.HORIZONTAL_EDGE
    }

    if (minX === 0 && maxX === 1) {
      type = IslandType.VERTICAL_EDGE
    }

    if (minX === this.width - 1 && maxX === this.width) {
      type = IslandType.VERTICAL_EDGE
    }
    return type
  }

  getIslands(): Island[] {
    const visited = new Set<string>()
    const islands: Island[] = []

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.get(x, y) === 1 && !visited.has(x + ',' + y)) {
          const { minX, maxX, minY, maxY } = this._findIslandBounds(x, y, visited)

          let type = this.getIslandType(minY, maxY, minX, maxX)

          islands.push(new Island(this, minX, maxX, minY, maxY, type))
        }
      }
    }

    return islands
  }

  private _findIslandBounds(startX: number, startY: number, visited: Set<string>): BoundsLike {
    const stack: Point[] = [{ x: startX, y: startY }]
    visited.add(startX + ',' + startY)

    let minX = startX
    let maxX = startX
    let minY = startY
    let maxY = startY

    while (stack.length > 0) {
      const { x, y } = stack.pop()!

      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)

      for (const [dx, dy] of CARDINAL_DIRECTIONS) {
        const nx = x + dx
        const ny = y + dy

        if (
          nx >= 0 &&
          nx < this.width &&
          ny >= 0 &&
          ny < this.height &&
          this.get(nx, ny) === 1 &&
          !visited.has(nx + ',' + ny)
        ) {
          visited.add(nx + ',' + ny)
          stack.push({ x: nx, y: ny })
        }
      }
    }
    maxX += 1
    maxY += 1
    return { minX, maxX, minY, maxY }
  }

  isWithinBorder(
    x: number,
    y: number,
    borderThickness: number = 1,
  ): boolean {
    return (x < borderThickness) ||
      (x >= this.width - borderThickness) ||
      (y < borderThickness) ||
      (y >= this.height - borderThickness)
  }

  getWithMinDistance(
    minDistance: number,
    value: Bit = 1,
  ): Point[] {
    const otherValue = value ? 0 : 1
    // Create distance map using BFS from all pixels with value 1
    const distanceMap = new Uint16Array(this.width * this.height)
    distanceMap.fill(Infinity)

    const queue: Point[] = []

    // Initialize queue with all pixels that have value 1
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.get(x, y) === value) {
          const idx = y * this.width + x
          distanceMap[idx] = 0
          queue.push({ x, y })
        }
      }
    }

    // BFS to compute distance from every pixel to nearest 1
    const visited = new Uint8Array(this.width * this.height)
    let queueIdx = 0

    for (let i = 0; i < queue.length; i++) {
      const idx = queue[i].y * this.width + queue[i].x
      visited[idx] = 1
    }

    while (queueIdx < queue.length) {
      const { x, y } = queue[queueIdx++]
      const currentDist = distanceMap[y * this.width + x]

      // Check all 8 adjacent pixels
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue

          const nx = x + dx
          const ny = y + dy

          if (!this.inBounds(nx, ny)) continue

          const neighborIdx = ny * this.width + nx

          if (visited[neighborIdx]) continue

          const neighborDist = Math.hypot(dx, dy)
          const newDist = currentDist + neighborDist

          distanceMap[neighborIdx] = newDist
          visited[neighborIdx] = 1
          queue.push({ x: nx, y: ny })
        }
      }
    }

    // Collect all pixels with value 0 and distance > minDistance
    const result: Point[] = []
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.get(x, y) === otherValue) {
          const idx = y * this.width + x
          if (distanceMap[idx] > minDistance) {
            result.push({ x, y })
          }
        }
      }
    }

    return result
  }
}

