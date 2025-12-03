import tinycolor from 'tinycolor2'
import type { RGBA } from './ImageData.ts'

export const parseColor = (color: string) => {
  const result = tinycolor(color)
  return result.toRgb()
}

export const parseColorData = (color: string): RGBA => {
  const result = tinycolor(color)
  const { r, g, b, a } = result.toRgb()

  return {
    r,
    g,
    b,
    a: Math.floor(Number(a) * 255),
  }
}


