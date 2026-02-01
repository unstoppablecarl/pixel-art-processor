import type { RGBAFloat } from './ImageData.ts'

export type BlendFn = (src: RGBAFloat, dst: RGBAFloat) => RGBAFloat

export function makeByteBlendAdapter(blend: BlendFn) {
  return (
    srcData: Uint8ClampedArray,
    dstData: Uint8ClampedArray,
    si: number,
    di: number,
  ) => {
    const src = {
      r: srcData[si] / 255,
      g: srcData[si + 1] / 255,
      b: srcData[si + 2] / 255,
      a: srcData[si + 3] / 255,
    } as RGBAFloat

    const dst = {
      r: dstData[di] / 255,
      g: dstData[di + 1] / 255,
      b: dstData[di + 2] / 255,
      a: dstData[di + 3] / 255,
    } as RGBAFloat

    const out = blend(src, dst)

    dstData[di] = Math.round(out.r * 255)
    dstData[di + 1] = Math.round(out.g * 255)
    dstData[di + 2] = Math.round(out.b * 255)
    dstData[di + 3] = Math.round(out.a * 255)
  }
}

export const blendSourceAlphaOver = (alpha: number): BlendFn => (src, dst) => {
  if (src.a === 0) return dst

  const outA = alpha * src.a + dst.a * (1 - src.a)

  return {
    r: (src.r * src.a + dst.r * dst.a * (1 - src.a)) / outA,
    g: (src.g * src.a + dst.g * dst.a * (1 - src.a)) / outA,
    b: (src.b * src.a + dst.b * dst.a * (1 - src.a)) / outA,
    a: outA,
  } as RGBAFloat
}

export const blendOverwrite: BlendFn = (src, dst) => {
  return { r: src.r, g: src.g, b: src.b, a: src.a } as RGBAFloat
}

export const blendSourceOver: BlendFn = blendSourceAlphaOver(1)

export const blendIgnoreTransparent: BlendFn = (src, dst) => {
  return src.a === 0 ? dst : src
}

export const blendIgnoreSolid: BlendFn = (src, dst) => {
  return src.a === 1 ? dst : src
}

export function blendImageData(
  dst: ImageData,
  src: ImageData,
  x: number,
  y: number,
  sx: number = 0,
  sy: number = 0,
  sw: number = src.width,
  sh: number = src.height,
  blend: BlendFn,
) {
  const byteBlend = makeByteBlendAdapter(blend)

  const dstData = dst.data
  const srcData = src.data
  const dstW = dst.width
  const srcW = src.width

  // Clip to destination bounds
  const maxW = Math.min(sw, dst.width - x)
  const maxH = Math.min(sh, dst.height - y)
  if (maxW <= 0 || maxH <= 0) return

  for (let iy = 0; iy < maxH; iy++) {
    const dstRow = (iy + y) * dstW
    const srcRow = (iy + sy) * srcW

    for (let ix = 0; ix < maxW; ix++) {
      const di = (dstRow + (ix + x)) * 4
      const si = (srcRow + (ix + sx)) * 4

      byteBlend(srcData, dstData, si, di)
    }
  }
}

export type ImageDataBlendFn = (
  dst: ImageData,
  src: ImageData,
  dx: number,
  dy: number,
  sx?: number,
  sy?: number,
  sw?: number,
  sh?: number,
) => void

export const blendImageDataSourceOver: ImageDataBlendFn = (
  dst: ImageData,
  src: ImageData,
  dx: number,
  dy: number,
  sx: number = 0,
  sy: number = 0,
  sw: number = src.width,
  sh: number = src.height,
) => blendImageData(dst, src, dx, dy, sx, sy, sw, sh, blendSourceOver)

export const blendImageDataIgnoreTransparent: ImageDataBlendFn = (
  dst: ImageData,
  src: ImageData,
  dx: number,
  dy: number,
  sx: number = 0,
  sy: number = 0,
  sw: number = src.width,
  sh: number = src.height,
) => blendImageData(dst, src, dx, dy, sx, sy, sw, sh, blendIgnoreTransparent)

export const blendImageDataIgnoreSolid: ImageDataBlendFn = (
  dst: ImageData,
  src: ImageData,
  dx: number,
  dy: number,
  sx: number = 0,
  sy: number = 0,
  sw: number = src.width,
  sh: number = src.height,
) => blendImageData(dst, src, dx, dy, sx, sy, sw, sh, blendIgnoreSolid)