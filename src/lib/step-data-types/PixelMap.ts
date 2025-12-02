import type { RGBA } from '../util/ImageData.ts'
import { BaseDataStructure } from './BaseDataStructure.ts'

export class PixelMap extends BaseDataStructure<RGBA, Uint8ClampedArray> {
  readonly __brand = 'PixelMap'
  static displayName = 'PixelMap'

  dataConstructor = Uint8ClampedArray

  protected initData(width: number, height: number): Uint8ClampedArray {
    return new Uint8ClampedArray(width * height * 4)
  }

  copy(): this {
    const dataCopy = new Uint8ClampedArray(this.data)
    return new PixelMap(this.width, this.height, dataCopy) as this
  }

  get(x: number, y: number): RGBA {
    const index = (y * this.width + x) * 4

    return {
      r: this.data[index]!,
      g: this.data[index + 1]!,
      b: this.data[index + 2]!,
      a: this.data[index + 3]!,
    }
  }

  set(x: number, y: number, { r, g, b, a }: RGBA): void {
    const index = (y * this.width + x) * 4
    this.data[index] = r
    this.data[index + 1] = g
    this.data[index + 2] = b
    this.data[index + 3] = a
  }

  toImageData(): ImageData {
    const dataCopy = new Uint8ClampedArray(this.data)
    return new ImageData(dataCopy, this.width, this.height)
  }

  static fromImageData(imageData: ImageData) {
    const dataCopy = new Uint8ClampedArray(imageData.data)
    return new PixelMap(imageData.width, imageData.height, dataCopy)
  }
}