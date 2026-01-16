import tinycolor from 'tinycolor2'
import type { RGBA } from './html-dom/ImageData.ts'

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

export function arrayIndexToColor(index: number, length: number, spin: number = 0): RGBA {
  const hue: number = (index * 360) / length
  const color = tinycolor({ h: hue, s: 1, l: .5 }).spin(spin * 360).toRgb()
  color.a = 255
  return color
}

