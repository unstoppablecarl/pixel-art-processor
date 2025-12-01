import { copyImageData } from '../util/ImageData.ts'
import { BaseDataStructure } from './BaseDataStructure.ts'
import { type HeightMap } from './HeightMap.ts'
import { PixelMap } from './PixelMap.ts'

export type Normal = {
  x: number,
  y: number,
  z: number
}

export class NormalMap extends BaseDataStructure<Normal> {
  readonly __brand = 'NormalMap'
  static displayName = 'NormalMap'

  dataConstructor = Uint8ClampedArray

  protected calcDataLength(width: number, height: number): number {
    return width * height * 4
  }

  get(x: number, y: number): Normal {
    const index = (y * this.width + x) * 4
    return {
      x: (this.data[index]! / 255) * 2 - 1,
      y: (this.data[index + 1]! / 255) * 2 - 1,
      z: (this.data[index + 2]! / 255) * 2 - 1,
    }
  }

  // Encode normal to pixel
  set(x: number, y: number, normal: Normal): void {
    const index = (y * this.width + x) * 4
    this.data[index] = ((normal.x + 1) * 0.5 * 255) | 0
    this.data[index + 1] = ((normal.y + 1) * 0.5 * 255) | 0
    this.data[index + 2] = ((normal.z + 1) * 0.5 * 255) | 0
    this.data[index + 3] = 255
  }

  static fromHeightmap(heightMap: HeightMap, strength: number): NormalMap {
    const { width, height, data } = heightMap
    const normalData = new Uint8ClampedArray(width * height * 4)

    const getHeight = (px: number, py: number): number => {
      return data[py * width + px]! / 255
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4

        const centerHeight = getHeight(x, y)
        const left = (x > 0) ? getHeight(x - 1, y) : centerHeight
        const right = (x < width - 1) ? getHeight(x + 1, y) : centerHeight
        const top = (y > 0) ? getHeight(x, y - 1) : centerHeight
        const bottom = (y < height - 1) ? getHeight(x, y + 1) : centerHeight
        const dx = ((right - left) / 2) * strength
        const dy = ((bottom - top) / 2) * strength
        const nx = -dx
        const ny = -dy
        const nz = 1
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz)
        const nnx = nx / len
        const nny = ny / len
        const nnz = nz / len
        normalData[idx] = ((nnx + 1) * 0.5 * 255) | 0
        normalData[idx + 1] = ((nny + 1) * 0.5 * 255) | 0
        normalData[idx + 2] = ((nnz + 1) * 0.5 * 255) | 0
        normalData[idx + 3] = 255
      }
    }
    return new NormalMap(width, height, normalData)
  }

  applyLighting(
    textureImageData: ImageData,
    lx: number,
    ly: number,
    lz: number,
  ) {

    const baseData = textureImageData.data
    const normalData = this.data
    const imgData = copyImageData(textureImageData)

    const data = imgData.data
    const llen = Math.sqrt(lx * lx + ly * ly + lz * lz)
    const nlx = lx / llen
    const nly = ly / llen
    const nlz = lz / llen
    for (let i = 0; i < data.length; i += 4) {
      const nx = (normalData[i]! / 255) * 2 - 1
      const ny = (normalData[i + 1]! / 255) * 2 - 1
      const nz = (normalData[i + 2]! / 255) * 2 - 1
      const dotProduct = Math.max(0, nx * nlx + ny * nly + nz * nlz)
      const ambient = 0.4
      const brightness = ambient + (1 - ambient) * dotProduct
      const R = baseData[i]! * brightness
      const G = baseData[i + 1]! * brightness
      const B = baseData[i + 2]! * brightness
      const A = baseData[i + 3]!

      data[i] = R
      data[i + 1] = G
      data[i + 2] = B
      data[i + 3] = A
    }

    return new PixelMap(this.width, this.height, imgData.data)
  }

  copy(): this {
    const dataCopy = new Uint8ClampedArray(this.data)
    return new NormalMap(this.width, this.height, dataCopy) as this
  }

  toImageData(): ImageData {
    const dataCopy = new Uint8ClampedArray(this.data)
    return new ImageData(dataCopy, this.width, this.height)
  }
}