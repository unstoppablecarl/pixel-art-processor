import { copyImageData } from '../util/ImageData.ts'

export function heightMapToNormalMap(imageData: ImageData, str: number) {
  const data = imageData.data
  const normalData = new Uint8ClampedArray(data.length)
  const w = imageData.width
  const h = imageData.height
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4
      const getHeight = (px: number, py: number): number => {
        const pidx = (py * w + px) * 4
        return (data[pidx]! + data[pidx + 1]! + data[pidx + 2]!) / 3 / 255
      }
      const centerHeight = getHeight(x, y)
      const left = (x > 0) ? getHeight(x - 1, y) : centerHeight
      const right = (x < w - 1) ? getHeight(x + 1, y) : centerHeight
      const top = (y > 0) ? getHeight(x, y - 1) : centerHeight
      const bottom = (y < h - 1) ? getHeight(x, y + 1) : centerHeight
      const dx = (right - left) * str
      const dy = (bottom - top) * str
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
  return new ImageData(normalData, w, h)
}

export function applyLighting(
  textureImageData: ImageData,
  normalMapImageData: ImageData,
  lx: number,
  ly: number,
  lz: number,
) {

  const baseData = textureImageData.data
  const normalData = normalMapImageData.data
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

    data[i] = Math.min(255, R)
    data[i + 1] = Math.min(255, G)
    data[i + 2] = Math.min(255, B)
    data[i + 3] = A
  }

  return imgData
}