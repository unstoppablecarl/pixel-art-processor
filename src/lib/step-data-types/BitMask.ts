import { eachImageDataPixel, type RGBA, updateImageData } from '../util/ImageData.ts'
import { BaseDataStructure } from './BaseDataStructure.ts'

export type Bit = 0 | 1

export class BitMask extends BaseDataStructure<Bit, Uint8Array> {
  readonly __brand = 'BitMask';
  static displayName = 'BitMask'

  protected readonly canUseDirectAccess = false

  constructor(width: number, height: number, data?: Uint8Array) {
    if (data === undefined) {
      const totalBits = width * height
      const byteCount = Math.ceil(totalBits / 8)
      data = new Uint8Array(byteCount)
    }
    super(width, height, data)
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
      return super.toImageData(valueToColor)
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
}

