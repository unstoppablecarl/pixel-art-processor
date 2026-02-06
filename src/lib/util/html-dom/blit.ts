import type { RGBAFloat } from './ImageData.ts'

export type BlendFn = {
  alwaysClearFirst?: boolean,
  (src: RGBAFloat, dst: RGBAFloat): RGBAFloat
}

const blendCache = new Map<BlendFn, ByteBlendAdapter>()

export function getBlendAdapter(fn: BlendFn) {
  let cached = blendCache.get(fn)
  if (cached === undefined) {
    cached = makeByteBlendAdapter(fn)
    blendCache.set(fn, cached)
  }
  return cached
}

export type ByteBlendAdapter = ReturnType<typeof makeByteBlendAdapter>

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
blendOverwrite.alwaysClearFirst = true

export const blendSourceOver: BlendFn = blendSourceAlphaOver(1)

export const blendIgnoreTransparent: BlendFn = (src, dst) => {
  return src.a === 0 ? dst : src
}

export const blendIgnoreSolid: BlendFn = (src, dst) => {
  return src.a === 1 ? dst : src
}

export type BlendImageDataOptions = {
  dx?: number,
  dy?: number,
  sx?: number,
  sy?: number,
  sw?: number,
  sh?: number,
  mask?: Uint8Array | null,
  blendMode?: BlendFn,
}

export function blendImageData(
  dst: ImageData,
  src: ImageData,
  opts: BlendImageDataOptions,
) {
  const {
    dx = 0,
    dy = 0,
    sx = 0,
    sy = 0,
    sw = src.width,
    sh = src.height,
    blendMode = blendOverwrite,
    mask,
  } = opts

  const byteBlend = makeByteBlendAdapter(blendMode)

  const dstData = dst.data
  const srcData = src.data
  const dstW = dst.width
  const srcW = src.width
  const useMask = !!mask

  // Clip to destination bounds
  const maxW = Math.min(sw, dst.width - dx)
  const maxH = Math.min(sh, dst.height - dy)
  if (maxW <= 0 || maxH <= 0) return

  for (let iy = 0; iy < maxH; iy++) {
    const dstRow = (iy + dy) * dstW
    const srcRow = (iy + sy) * srcW

    for (let ix = 0; ix < maxW; ix++) {
      if (useMask && mask![iy * sw + ix] === 0) continue

      const di = (dstRow + (ix + dx)) * 4
      const si = (srcRow + (ix + sx)) * 4

      byteBlend(srcData, dstData, si, di)
    }
  }
}

export type ImageDataBlendFn = (
  dst: ImageData,
  src: ImageData,
  opts: BlendImageDataOptions,
) => void

export const blendImageDataOverwrite = makeVariant(blendOverwrite)
export const blendImageDataSourceOver = makeVariant(blendSourceOver)
export const blendImageDataIgnoreTransparent = makeVariant(blendIgnoreTransparent)
export const blendImageDataIgnoreSolid = makeVariant(blendIgnoreSolid)

function makeVariant(blendMode: BlendFn) {
  return (
    dst: ImageData,
    src: ImageData,
    opts: BlendImageDataOptions,
  ) => blendImageData(dst, src, { ...opts, blendMode })
}