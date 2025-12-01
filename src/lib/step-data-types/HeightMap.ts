import type { RGBA } from '../util/ImageData.ts'
import { BaseDataStructure } from './BaseDataStructure.ts'
import { NormalMap } from './NormalMap.ts'

export class HeightMap extends BaseDataStructure<number, Uint8ClampedArray> {
  readonly __brand = 'HeightMap'
  static displayName = 'HeightMap'

  constructor(width: number, height: number, data?: Uint8ClampedArray) {
    if (data === undefined) {
      data = new Uint8ClampedArray(width * height)
    }
    super(width, height, data)
  }

  get(x: number, y: number): number {
    return this.data[y * this.width + x]!
  }

  set(x: number, y: number, value: number): void {
    this.data[y * this.width + x] = value
  }

  copy(): this {
    const clone = new HeightMap(this.width, this.height) as this
    // efficient copy (works for Uint8Array or Uint8ClampedArray)
    clone.data.set(this.data)
    return clone
  }

  static fromImageData(imageData: ImageData, toGrayscaleValue: (color: RGBA) => number = standardLuminanceFormula): HeightMap {
    const heightmap = new HeightMap(imageData.width, imageData.height)
    const pixels = imageData.data
    const data = heightmap.data

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
    const data = this.data

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

  getHeight(x: number, y: number): number {
    return this.data[y * this.width + x]! / 255
  }

  toNormalMap(strength: number) {
    const w = this.width
    const h = this.height
    const result = new NormalMap(this.width, this.height)

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4
        const centerHeight = this.getHeight(x, y)
        const left = (x > 0) ? this.getHeight(x - 1, y) : centerHeight
        const right = (x < w - 1) ? this.getHeight(x + 1, y) : centerHeight
        const top = (y > 0) ? this.getHeight(x, y - 1) : centerHeight
        const bottom = (y < h - 1) ? this.getHeight(x, y + 1) : centerHeight
        const dx = (right - left) * strength
        const dy = (bottom - top) * strength
        const nx = -dx
        const ny = -dy
        const nz = 1
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz)
        const nnx = nx / len
        const nny = ny / len
        const nnz = nz / len
        result.data[idx] = ((nnx + 1) * 0.5 * 255) | 0
        result.data[idx + 1] = ((nny + 1) * 0.5 * 255) | 0
        result.data[idx + 2] = ((nnz + 1) * 0.5 * 255) | 0
        result.data[idx + 3] = 255
      }
    }
    return result
  }

}

export const standardLuminanceFormula = ({ r, g, b }: RGBA) => Math.round(0.299 * r + 0.587 * g + 0.114 * b)