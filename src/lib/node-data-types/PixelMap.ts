import {
  type Color32,
  type RGBA,
  type SerializedRGBA,
  serializeRGBA,
  unpackAlpha,
  unpackColorTo,
} from '../util/data/color.ts'

import { validateSizes } from './_helpers/_data-type-helpers.ts'
import { BaseDataStructure } from './BaseDataStructure.ts'

export class PixelMap extends BaseDataStructure<RGBA, Color32, Uint8ClampedArray, SerializedRGBA> {
  readonly __brand = 'PixelMap'
  static displayName = 'PixelMap'

  protected initData(width: number, height: number): Uint8ClampedArray {
    return new Uint8ClampedArray(width * height * 4)
  }

  protected getRaw(idx: number): Color32 {
    return this._data32![idx] as Color32
  }

  protected setRaw(idx: number, value: Color32): void {
    this._data32![idx] = value
  }

  getPacked(x: number, y: number): Color32 {
    return this._data32![y * this.width + x] as Color32
  }

  setPacked(x: number, y: number, color: Color32): void {
    this._data32![y * this.width + x] = color
  }

  get(x: number, y: number): RGBA {
    const index = (y * this.width + x) * 4

    return {
      r: this._data[index]!,
      g: this._data[index + 1]!,
      b: this._data[index + 2]!,
      a: this._data[index + 3]!,
    }
  }

  set(x: number, y: number, { r, g, b, a }: RGBA): void {
    const index = (y * this.width + x) * 4
    this._data[index] = r
    this._data[index + 1] = g
    this._data[index + 2] = b
    this._data[index + 3] = a
  }

  toImageData(): ImageData {
    const dataCopy = new Uint8ClampedArray(this._data)
    return new ImageData(dataCopy, this.width, this.height)
  }

  static fromImageData(imageData: ImageData) {
    return new PixelMap(imageData.width, imageData.height, imageData.data)
  }

  protected serializeValue(value: Color32): SerializedRGBA {
    return serializeRGBA(unpackColorTo(value))
  }

  merge(other: PixelMap, minAlpha = 0) {
    validateSizes(this, other)
    other.each((x, y, v) => {

      const alpha = unpackAlpha(v)
      if (alpha > minAlpha) {
        const idx = y * this.width + x
        this.setRaw(idx, v)
      }
    })

    return this
  }
}