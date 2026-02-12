import type { RGBA } from '../util/color.ts'
import { BaseDataStructure } from './BaseDataStructure.ts'

export class HeightMap extends BaseDataStructure<number, Uint8ClampedArray> {
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
  }

  static fromImageData(imageData: ImageData, toGrayscaleValue: (color: RGBA) => number = standardLuminanceFormula): HeightMap {
    const heightmap = new HeightMap(imageData.width, imageData.height)
    const pixels = imageData.data
    const data = heightmap._data

    let heightIdx = 0
    let pixelIdx = 0
    const len = data.length

    for (let i = 0; i < len; i++) {
      const r = pixels[pixelIdx++]!
      const g = pixels[pixelIdx++]!
      const b = pixels[pixelIdx++]!
      const a = pixels[pixelIdx++]!
      data[heightIdx++] = toGrayscaleValue({ r, g, b, a })
    }

    return heightmap
  }

  toImageData(): ImageData {
    const imageData = new ImageData(this.width, this.height)
    const pixels = imageData.data
    const data = this._data

    let heightIdx = 0
    let pixelIdx = 0
    const len = data.length

    for (let i = 0; i < len; i++) {
      const value = data[heightIdx++]!
      pixels[pixelIdx++] = value // R
      pixels[pixelIdx++] = value // G
      pixels[pixelIdx++] = value // B
      pixels[pixelIdx++] = 255   // A
    }

    return imageData
  }
}

export const standardLuminanceFormula = ({ r, g, b }: RGBA) => Math.round(0.299 * r + 0.587 * g + 0.114 * b)