import { Bounds, type BoundsLike } from '../data/Bounds.ts'
import { eachImageDataPixel, type RGBA, updateImageData } from '../util/ImageData.ts'
import { BaseDataStructure, CARDINAL_DIRECTIONS, type Point } from './BaseDataStructure.ts'
import { Island, IslandType } from './BitMask/Island.ts'
import { PixelMap } from './PixelMap.ts'

export type Bit = 0 | 1

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

  toPixelMap(valueToColor?: ((value: Bit) => RGBA)): PixelMap;
  toPixelMap(color1?: RGBA, color0?: RGBA): PixelMap;

  toPixelMap(
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
  ): PixelMap {
    return PixelMap.fromImageData(this.toImageData(...arguments as any))
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
    let topCount = 0
    if (minY === 0) {
      for (let x = minX; x < maxX; x++) {
        if (this.get(x, 0) === 1) topCount++
      }
    }
    let bottomCount = 0
    if (maxY === this.height) {
      const bottomY = this.height - 1
      for (let x = minX; x < maxX; x++) {
        if (this.get(x, bottomY) === 1) bottomCount++
      }
    }
    let leftCount = 0
    if (minX === 0) {
      for (let y = minY; y < maxY; y++) {
        if (this.get(0, y) === 1) leftCount++
      }
    }
    let rightCount = 0
    if (maxX === this.width) {
      const rightX = this.width - 1
      for (let y = minY; y < maxY; y++) {
        if (this.get(rightX, y) === 1) rightCount++
      }
    }

    const horzCount = Math.max(topCount, bottomCount)
    const vertCount = Math.max(leftCount, rightCount)

    if (horzCount > vertCount) {
      if (topCount > bottomCount) {
        return IslandType.TOP_EDGE
      } else if (bottomCount > topCount) {
        return IslandType.BOTTOM_EDGE
      } else {
        return IslandType.TOP_EDGE | IslandType.BOTTOM_EDGE
      }
    } else if (vertCount > horzCount) {
      if (leftCount > rightCount) {
        return IslandType.LEFT_EDGE
      } else if (rightCount > leftCount) {
        return IslandType.RIGHT_EDGE
      } else {
        return IslandType.LEFT_EDGE | IslandType.RIGHT_EDGE
      }
    } else {
      return IslandType.NORMAL
    }
  }

  getInnerIslands() {
    return this.getIslands().filter(i => i.type === IslandType.NORMAL)
  }

  getEdgeIslands() {
    return this.getIslands().filter(i => i.type !== IslandType.NORMAL)
  }

  getIslands(): Island[] {
    const visited = new Set<string>()
    const islands: Island[] = []

    let idIncrement = 0
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.get(x, y) === 1 && !visited.has(x + ',' + y)) {
          const { minX, maxX, minY, maxY } = this._findIslandBounds(x, y, visited)

          let type = this.getIslandType(minY, maxY, minX, maxX)

          islands.push(new Island(this, idIncrement++, minX, maxX, minY, maxY, type))
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

  borderToBounds(
    borderThickness: number = 1,
  ): Bounds {
    return new Bounds(borderThickness, this.width - borderThickness, borderThickness, this.height - borderThickness)
  }

  adjacentSum(x: number, y: number): number {
    let total = 0
    this.eachAdjacent(x, y, (x, y, v) => total += v)
    return total
  }

  invert() {
    this.data.set(this.invertData(this.data))
  }

  protected invertData(data: Uint8Array): Uint8Array {
    for (let i = 0; i < data.length; i++) {
      // js handles bitwise operations on 32-bit signed integers
      // you need to use a mask (& 0xFF)
      // to ensure the result stays within the 0–255 range of a Uint8.
      // ~ flips the bits, & 0xFF keeps it as a valid byte
      data[i] = ~data[i] & 0xFF
    }
    const remainingBits = (this.width * this.height) % 8
    if (remainingBits !== 0) {
      const mask = (0xFF << (8 - remainingBits)) & 0xFF
      data[data.length - 1] &= mask // Forces trailing bits back to 0
    }
    return data
  }
}

