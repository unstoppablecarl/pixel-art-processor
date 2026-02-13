import { type Normal, type Normal32, packNormal, unpackNormal, unpackNormalTo } from '../util/data/normal.ts'
import { BaseDataStructure } from './BaseDataStructure.ts'
import { type HeightMap } from './HeightMap.ts'
import { PixelMap } from './PixelMap.ts'

/**
 * NormalMap: Stores geometric surface vectors as packed 32-bit integers.
 * Uses the "Normal-as-Color" technique (8-bit per channel) for compatibility.
 */
export class NormalMap extends BaseDataStructure<Normal, Normal32, Uint8ClampedArray, string> {
  readonly __brand = 'NormalMap'
  static displayName = 'NormalMap'

  protected initData(width: number, height: number): Uint8ClampedArray {
    // 4 bytes per pixel (standard RGBA layout)
    return new Uint8ClampedArray(width * height * 4)
  }

  protected getRaw(idx: number): Normal32 {
    return this._data32![idx] as Normal32
  }

  protected setRaw(idx: number, value: Normal32): void {
    this._data32![idx] = value
  }

  get(x: number, y: number): Normal {
    // We return a new object here for public API safety,
    // but internal loops should use getRaw + unpackNormalTo
    const packed = this.getRaw(this.idx(x, y))
    return unpackNormal(packed)
  }

  set(x: number, y: number, normal: Normal): void {
    this.setRaw(this.idx(x, y), packNormal(normal.x, normal.y, normal.z))
    this.invalidate()
  }

  /**
   * Generates a NormalMap from a HeightMap using a Sobel-like filter.
   */
  static fromHeightmap(heightMap: HeightMap, strength: number): NormalMap {
    const { width, height } = heightMap
    const map = new NormalMap(width, height)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Sample surrounding pixels for gradient calculation
        const left = heightMap.get(Math.max(0, x - 1), y) / 255
        const right = heightMap.get(Math.min(width - 1, x + 1), y) / 255
        const top = heightMap.get(x, Math.max(0, y - 1)) / 255
        const bottom = heightMap.get(x, Math.min(height - 1, y + 1)) / 255

        const nx = -(right - left) * strength
        const ny = -(bottom - top) * strength
        const nz = 1.0 // Up vector

        const len = Math.sqrt(nx * nx + ny * ny + nz * nz)

        // Pack directly into the buffer
        map.setRaw(y * width + x, packNormal(nx / len, ny / len, nz / len))
      }
    }
    return map.invalidate()
  }

  applyLighting(
    source: ImageData,
    lx: number,
    ly: number,
    lz: number,
  ): PixelMap {
    const { width, height } = source
    const result = new PixelMap(width, height)
    const count = width * height

    // Normalize light vector
    const llen = Math.sqrt(lx * lx + ly * ly + lz * lz)
    const nlx = lx / llen, nly = ly / llen, nlz = lz / llen

    // Get 32-bit views for all buffers
    // This allows us to process 4 bytes at a time
    const nData = this._data32!
    const sData = new Uint32Array(source.data.buffer)
    const rData = result.data32! // Using the public data32 getter we added

    for (let i = 0; i < count; i++) {
      // 1. Unpack normal
      const { x, y, z } = unpackNormalTo(nData[i] as Normal32)

      // 2. Compute lighting (Ambient 0.3 + Diffuse 0.7)
      const dot = Math.max(0, x * nlx + y * nly + z * nlz)
      const brightness = 0.3 + 0.7 * dot

      // 3. Apply to source pixel
      const packedCol = sData[i]!
      const r = ((packedCol & 0xFF) * brightness) | 0
      const g = (((packedCol >>> 8) & 0xFF) * brightness) | 0
      const b = (((packedCol >>> 16) & 0xFF) * brightness) | 0
      const a = (packedCol >>> 24) & 0xFF

      rData[i] = (r | (g << 8) | (b << 16) | (a << 24))
    }

    return result.invalidate()
  }

  toImageData(): ImageData {
    return new ImageData(new Uint8ClampedArray(this._data), this.width, this.height)
  }

  protected serializeValue(v: Normal32): string {
    const { x, y, z } = unpackNormalTo(v)
    return `${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)}`
  }
}