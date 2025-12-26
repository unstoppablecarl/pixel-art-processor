import { createNoise2D } from 'simplex-noise'
import { prng } from '../util/prng.ts'

export interface GenerateNoiseOptions {
  seed?: number;
  amplitude: number;
  frequency: number;
  octaves: number;
  gain?: number,
  lacunarity?: number,
}

export const GENERATE_NOISE_DEFAULTS = {
  seed: 0,
  amplitude: 1,
  frequency: 0.04,
  octaves: 4,
  gain: 0.5,
  lacunarity: 2,
}

// Fractional Brownian Motion
function fbm(x: number, y: number, options: GenerateNoiseOptions, noise2d: (x: number, y: number) => number) {
  const { amplitude, frequency, octaves, gain, lacunarity } = options as typeof GENERATE_NOISE_DEFAULTS

  let value = 0
  let amp = amplitude
  let freq = frequency
  for (let i = 0; i < octaves; i++) {
    value += noise2d(x * freq, y * freq) * amp
    amp *= gain
    freq *= lacunarity
  }
  return value
}

export function generateNoise(width: number, height: number, options: GenerateNoiseOptions): ImageData {
  options = Object.assign(GENERATE_NOISE_DEFAULTS, options)

  const noise2d = createNoise2D(prng)

  const result = new ImageData(width, height)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {

      // -1 to 1
      const raw = fbm(x, y, options, noise2d)
      // 0 to 1
      const noise = (raw + 1) / 2
      const colorValue = noise * 255
      const idx = y * width + x

      const i = idx * 4
      result.data[i + 0] = colorValue
      result.data[i + 1] = colorValue
      result.data[i + 2] = colorValue
      result.data[i + 3] = 255
    }
  }

  return result
}

export function mergeHeightMaps(heightMapA: ImageData, heightMapB: ImageData, cb: (a: number, b: number) => number): ImageData {
  const { width, height } = heightMapA
  const result = new ImageData(width, height)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {

      const idx = y * width + x
      const i = idx * 4
      const a = heightMapA.data[i]!
      const b = heightMapB.data[i]!
      const colorValue = cb(a, b)
      result.data[i + 0] = colorValue
      result.data[i + 1] = colorValue
      result.data[i + 2] = colorValue
      result.data[i + 3] = 255
    }
  }

  return result
}