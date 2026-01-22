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

export const blendSourceOver: BlendFn = blendSourceAlphaOver(1)

export const blendSetAlpha = (alpha: number): BlendFn => (src, dst) => {
  console.log(src.a)
  src.a = alpha

  return src.a === 0 ? dst : src
}

export const blendIgnoreTransparent: BlendFn = (src, dst) => {
  console.log(src.a)
  return src.a === 0 ? dst : src
}

export const blendIgnoreSolid: BlendFn = (src, dst) => {
  if (src.a === 1) {

    console.log('solid')
  }
  return src.a === 1 ? dst : src
}

export function blendImageData(
  dst: ImageData,
  src: ImageData,
  dx: number,
  dy: number,
  blend: BlendFn,
) {
  const byteBlend = makeByteBlendAdapter(blend)

  const dstData = dst.data
  const srcData = src.data
  const dstW = dst.width
  const srcW = src.width
  const srcH = src.height

  for (let sy = 0; sy < srcH; sy++) {
    for (let sx = 0; sx < srcW; sx++) {
      const dstX = dx + sx
      const dstY = dy + sy

      if (dstX < 0 || dstY < 0 || dstX >= dst.width || dstY >= dst.height)
        continue

      const si = (sy * srcW + sx) * 4
      const di = (dstY * dstW + dstX) * 4

      byteBlend(srcData, dstData, si, di)
    }
  }
}

export const blendImageDataSourceOver = (
  dst: ImageData,
  src: ImageData,
  dx: number,
  dy: number,
) => blendImageData(dst, src, dx, dy, blendSourceOver)

export const blendImageDataIgnoreTransparent = (
  dst: ImageData,
  src: ImageData,
  dx: number,
  dy: number,
) => blendImageData(dst, src, dx, dy, blendIgnoreTransparent)

export const blendImageDataIgnoreSolid = (
  dst: ImageData,
  src: ImageData,
  dx: number,
  dy: number,
) => blendImageData(dst, src, dx, dy, blendIgnoreSolid)
