import type { Color32 } from 'pixel-data-js'
import tinycolor from 'tinycolor2'
import type { Point } from '../../node-data-types/BaseDataStructure.ts'

// ALL values are 0-255 (including alpha which in CSS is 0-1)
export type RGBA = { r: number, g: number, b: number, a: number }
// ALL values are 0-1
export type RGBAFloat = { r: number, g: number, b: number, a: number, readonly __brandRGBAFloat: unique symbol }
export type SerializedRGBA = string
export type PixelColor = Point & { color: RGBA }
export const RGBA_ERASE = { r: 0, g: 0, b: 0, a: 0 } as Readonly<RGBA>
export const RGBA_WHITE = { r: 255, g: 255, b: 255, a: 255 } as Readonly<RGBA>
export const RGBA_RED = { r: 255, g: 0, b: 0, a: 255 } as Readonly<RGBA>
export const RGBA_CYAN = { r: 0, g: 255, b: 255, a: 255 } as Readonly<RGBA>

export function serializeRGBA({ r, g, b, a }: RGBA): SerializedRGBA {
  return `${r},${g},${b},${a}`
}

export const parseColor = (color: string): RGBA => {
  const result = tinycolor(color)
  const { r, g, b, a } = result.toRgb()

  return {
    r,
    g,
    b,
    a: Math.floor(Number(a) * 255),
  }
}

export function packRGBA({ r, g, b, a }: RGBA): Color32 {
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0 as Color32
}

const SCRATCH_RGBA: RGBA = { r: 0, g: 0, b: 0, a: 0 }

export function unpackColorTo(packed: Color32, target = SCRATCH_RGBA): RGBA {
  target.r = (packed >>> 0) & 0xFF
  target.g = (packed >>> 8) & 0xFF
  target.b = (packed >>> 16) & 0xFF
  target.a = (packed >>> 24) & 0xFF
  return target
}

export function arrayIndexToColor(index: number, length: number, alpha = 255, spin = 0): RGBA {
  const hue: number = (index * 360) / length
  const color = tinycolor({ h: hue, s: 1, l: .5 }).spin(spin * 360).toRgb()
  color.a = alpha
  return color
}

