import { EASE, lerp } from '../_helpers.ts'
import { copyImageData, invertImageData } from '../util/ImageData.ts'

export interface InnerGlowOptions {
  startHeight?: number,  // Inner height (0-255, default 0 for depressed)
  endHeight?: number,    // Edge height (0-255, default 255 for raised)
  size?: number,         // Gradient band width in pixels
  choke?: number,     // 0-1: Compress falloff
  easing?: keyof typeof EASE,
  invert?: boolean;  // False: high edge/low inner; True: low edge/high inner
  fromCenter?: boolean,
  fillTransparent?: boolean,
  fillTransparentValue?: 0,
}

export const INNER_GLOW_DEFAULTS: Required<InnerGlowOptions> = {
  startHeight: 0,
  endHeight: 255,
  size: 10,
  choke: 0,
  fromCenter: false,
  easing: 'linear',
  invert: false,
  fillTransparent: false,
  fillTransparentValue: 0,
}

export function applyInnerGlow(imageData: ImageData, options: InnerGlowOptions = {}): ImageData {
  const opts = Object.assign(INNER_GLOW_DEFAULTS, options) as Required<InnerGlowOptions>
  imageData = copyImageData(imageData)

  const {
    startHeight,
    endHeight,
    size,
    choke,
    fromCenter,
    easing,
    invert,
  } = opts

  const data = imageData.data
  const w = imageData.width
  const h = imageData.height
  const totalPixels = w * h

  const { mask, dist } = getBoundaries(totalPixels, data, h, w)
  // choke shrinks the size
  const rawEffectiveSize = size * (1 - choke)
  const effectiveSize = Math.max(rawEffectiveSize, 1)

  if (effectiveSize <= 0) return imageData

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x
      if (mask[idx] === 0) {
        // Outside: Black (low), transparent
        const i = idx * 4
        data[i + 0] = 0
        data[i + 1] = 0
        data[i + 2] = 0
        data[i + 3] = 0
        continue
      }

      // distance from edge
      const distance = dist[idx]!

      if (distance === -1 || distance > size) {
        // Inner island (beyond band): startHeight, full opaque
        const i = idx * 4
        const value = startHeight
        data[i + 0] = value
        data[i + 1] = value
        data[i + 2] = value
        data[i + 3] = 255
        continue
      }

      // percent along the glow band 0-1 (flipped if center source)
      let t = distance / size
      if (fromCenter) {
        t = 1 - t
      }

      // intensity: fall from source (high) to opposite (low), choked near source
      const intensityT = t / effectiveSize  // Compresses near t=0 (source)
      // high at source (t=0), low at end (t=1)
      const intensity = 1 - EASE[easing](Math.min(intensityT, 1))
      const height = lerp(endHeight, startHeight, t)
      const finalValue = Math.round(height * intensity)

      const i = idx * 4
      data[i + 0] = finalValue
      data[i + 1] = finalValue
      data[i + 2] = finalValue
      data[i + 3] = 255
    }
  }

  if (invert) {
    invertImageData(imageData)
  }
  return imageData
}

function getBoundaries(totalPixels: number, data: Uint8ClampedArray, h: number, w: number): {
  mask: Uint8Array;
  dist: Float32Array
} {
  const mask = new Uint8Array(totalPixels)
  for (let k = 0, i = 0; i < data.length; i += 4, k++) {
    mask[k] = data[i + 3]! > 0 ? 1 : 0
  }

  const dist = new Float32Array(totalPixels)
  dist.fill(-1)

  const dirs: [number, number][] = [
    [-1, -1], [1, 1], [-1, 1], [1, -1],
    [0, 1], [0, -1], [1, 0], [-1, 0],
  ]

  const orthoDirs: [number, number][] = [[0, 1], [0, -1], [1, 0], [-1, 0]]

  const queue: [number, number][] = []
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x
      if (mask[idx] === 0) continue

      let isBoundary = false
      for (let [dx, dy] of orthoDirs) {
        const nx = x + dx, ny = y + dy
        if (nx < 0 || nx >= w || ny < 0 || ny >= h || mask[ny * w + nx] === 0) {
          isBoundary = true
          break
        }
      }
      if (isBoundary) {
        dist[idx] = 0
        queue.push([x, y])
      }
    }
  }

  while (queue.length > 0) {
    const [x, y] = queue.shift()!
    const cidx = y * w + x
    const cd = dist[cidx]!
    for (let [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
      const nidx = ny * w + nx
      if (mask[nidx] === 1 && dist[nidx] === -1) {
        dist[nidx] = cd + 1
        queue.push([nx, ny])
      }
    }
  }

  return { mask, dist }
}
