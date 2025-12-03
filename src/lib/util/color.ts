import { ColorSpace, parse, sRGB } from 'colorjs.io/fn'
import type { RGBA } from './ImageData.ts'

// Can parse keywords and hex colors
ColorSpace.register(sRGB)
export const parseColor = (color: string): RGBA => {
  const result = parse(color)

  return {
    r: result.coords[0],
    g: result.coords[1],
    b: result.coords[2],
    a: Math.floor(Number(result.alpha) * 255),
  }
}


