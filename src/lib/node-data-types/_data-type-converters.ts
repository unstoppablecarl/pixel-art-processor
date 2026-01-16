import type { NodeDataTypeInstance } from './_node-data-types.ts'
import type { HeightMap } from './HeightMap.ts'
import { NormalMap } from './NormalMap.ts'

export function heightMapToNormalMap(heightMap: HeightMap, strength: number): NormalMap {
  const w = heightMap.width
  const h = heightMap.height
  const result = new NormalMap(heightMap.width, heightMap.height)

  const getHeight = (x: number, y: number): number => {
    return heightMap.data[y * heightMap.width + x]! / 255
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4
      const centerHeight = getHeight(x, y)
      const left = (x > 0) ? getHeight(x - 1, y) : centerHeight
      const right = (x < w - 1) ? getHeight(x + 1, y) : centerHeight
      const top = (y > 0) ? getHeight(x, y - 1) : centerHeight
      const bottom = (y < h - 1) ? getHeight(x, y + 1) : centerHeight
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

export function validateSizes(a: NodeDataTypeInstance, b: NodeDataTypeInstance) {
  if (a.width !== b.width) {
    const msg = `A width: ${a.width} does not equal B width: ${b.width}`
    console.error(msg)
    throw new Error(msg)
  }

  if (a.height !== b.height) {
    const msg = `A height: ${a.height} does not equal B height: ${b.height}`
    console.error(msg)
    throw new Error(msg)
  }
}