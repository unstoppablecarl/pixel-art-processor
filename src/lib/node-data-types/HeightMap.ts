import type { RGBA } from '../util/color.ts'
import { BaseDataStructure } from './BaseDataStructure.ts'

export class HeightMap extends BaseDataStructure<number, number, Uint8ClampedArray, string> {
  readonly __brand = 'HeightMap'
  static displayName = 'HeightMap'

  protected initData(width: number, height: number): Uint8ClampedArray {
    return new Uint8ClampedArray(width * height)
  }

  get(x: number, y: number): number {
    return this._data[y * this.width + x]!
  }

  set(x: number, y: number, value: number): void {
    this._data[y * this.width + x] = value
    this.invalidate()
  }

  static fromImageData(
    imageData: ImageData,
    toGrayscaleValue: (color: RGBA) => number = standardLuminanceFormula,
  ): HeightMap {
    const { width, height, data: pixels } = imageData
    const heightmap = new HeightMap(width, height)
    const dest = heightmap._data

    for (let i = 0; i < dest.length; i++) {
      const p = i * 4
      dest[i] = toGrayscaleValue({
        r: pixels[p]!,
        g: pixels[p + 1]!,
        b: pixels[p + 2]!,
        a: pixels[p + 3]!,
      })
    }

    return heightmap
  }

  toImageData(): ImageData {
    const img = new ImageData(this.width, this.height)
    const out32 = new Uint32Array(img.data.buffer)
    const src = this._data

    for (let i = 0; i < src.length; i++) {
      const v = src[i]!
      // Pack as 0xAABBGGRR. Since it's grayscale, R=G=B=v.
      out32[i] = (255 << 24) | (v << 16) | (v << 8) | v
    }
    return img
  }

  protected serializeValue(v: number): string {
    return v.toString()
  }
}

export const standardLuminanceFormula = ({ r, g, b }: RGBA) => Math.round(0.299 * r + 0.587 * g + 0.114 * b)