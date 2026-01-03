import { eachImageDataPixel, type RGBA, updateImageData } from '../util/ImageData.ts'
import { BaseDataStructure } from './BaseDataStructure.ts'
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

