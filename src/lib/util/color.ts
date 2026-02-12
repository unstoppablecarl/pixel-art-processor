import tinycolor from 'tinycolor2'
import type { Point } from '../node-data-types/BaseDataStructure.ts'
import type { BlendFn } from './html-dom/blit.ts'

// ALL values are 0-255 (including alpha which in CSS is 0-1)
export type RGBA = { r: number, g: number, b: number, a: number }
// ALL values are 0-1
export type RGBAFloat = { r: number, g: number, b: number, a: number, readonly __brandRGBAFloat: unique symbol }
export type SerializedRGBA = string
export type PixelColor = Point & { color: RGBA }
export type PixelBlend = PixelColor & { blend: BlendFn }
export const RGBA_ERASE = { r: 0, g: 0, b: 0, a: 0 } as Readonly<RGBA>
export const RGBA_WHITE = { r: 255, g: 255, b: 255, a: 255 } as Readonly<RGBA>
export const RGBA_RED = { r: 255, g: 0, b: 0, a: 255 } as Readonly<RGBA>

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

export type Color32 = number;

/**
 * Packs RGBA into a 32-bit integer compatible with
 * Little-Endian Uint32Array views on ImageData.
 */
export function packColor(r: number, g: number, b: number, a: number): Color32 {
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0
}

export function packRGBA({ r, g, b, a }: RGBA): Color32 {
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0
}

export function unpackColor(packed: number): RGBA {
  return {
    r: (packed >>> 0) & 0xFF,
    g: (packed >>> 8) & 0xFF,
    b: (packed >>> 16) & 0xFF,
    a: (packed >>> 24) & 0xFF,
  }
}

export function RGBAToCssColor(color: RGBA) {
  return `rgba(${color.r},${color.g},${color.b},${color.a / 255})`
}

export function arrayIndexToColor(index: number, length: number, alpha = 255, spin = 0): RGBA {
  const hue: number = (index * 360) / length
  const color = tinycolor({ h: hue, s: 1, l: .5 }).spin(spin * 360).toRgb()
  color.a = alpha
  return color
}

export function colorDistance(a: RGBA, b: RGBA) {
  // Photoshop-like: max channel difference
  return Math.max(
    Math.abs(a.r - b.r),
    Math.abs(a.g - b.g),
    Math.abs(a.b - b.b),
    Math.abs(a.a - b.a),
  )
}

