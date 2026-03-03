import { packRGBA, type RGBA } from '../util/data/color.ts'
import { BaseDataStructure } from './BaseDataStructure.ts'

export type Bit = 0 | 1

export class BitMask extends BaseDataStructure<Bit, Bit, Uint8Array> {
  readonly __brand = 'BitMask'
  static displayName = 'BitMask'

  protected initData(width: number, height: number): Uint8Array {
    return new Uint8Array(width * height)
  }

  get(x: number, y: number): Bit {
    return this._data[y * this.width + x] as Bit
  }

  set(x: number, y: number, value: Bit | number): void {
    const idx = y * this.width + x
    this._data[idx] = value
    this.invalidate()
  }

  /**
   * Performance: Converts the mask to an ImageData by packing colors
   * into a 32-bit buffer.
   */
  toImageData(valueToColor?: ((value: Bit) => RGBA)): ImageData;
  toImageData(color1?: RGBA, color0?: RGBA): ImageData;
  toImageData(
    valueToColor: ((value: Bit) => RGBA) | RGBA = { r: 255, g: 255, b: 255, a: 255 },
    colorB: RGBA = { r: 0, g: 0, b: 0, a: 0 },
  ): ImageData {
    const { width, height, _data } = this
    const result = new ImageData(width, height)
    const data32 = new Uint32Array(result.data.buffer)

    if (typeof valueToColor === 'function') {
      for (let i = 0; i < _data.length; i++) {
        data32[i] = packRGBA(valueToColor(_data[i] as Bit))
      }
    } else {
      const packedA = packRGBA(valueToColor) as number
      const packedB = packRGBA(colorB) as number

      for (let i = 0; i < _data.length; i++) {
        // High speed branchless-style toggle
        data32[i] = _data[i] === 1 ? packedA : packedB
      }
    }

    return result
  }

  static fromImageData(imageData: ImageData): BitMask {
    const { width, height } = imageData
    const result = new BitMask(width, height)
    const maskData = result.data
    const input32 = new Uint32Array(imageData.data.buffer)

    for (let i = 0; i < input32.length; i++) {
      // Check alpha channel (top 8 bits of a 32-bit pixel: 0xAABBGGRR or 0xRRGGBBAA depending on endianness)
      // A non-zero check on the 32-bit integer is the fastest way to detect "any" color/alpha.
      maskData[i] = input32[i] !== 0 ? 1 : 0
    }

    return result.invalidate()
  }

  adjacentSum(x: number, y: number): number {
    let total = 0
    this.eachAdjacent(x, y, (val) => total += val)
    return total
  }

  invert(): void {
    const data = this._data
    for (let i = 0; i < data.length; i++) {
      data[i] = data[i] === 0 ? 1 : 0
    }
    this.invalidate()
  }
}