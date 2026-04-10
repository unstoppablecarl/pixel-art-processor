import type { RGBAFloat } from '../data/color.ts'

export type BlendFn = {
  alwaysClearFirst?: boolean,
  (src: RGBAFloat, dst: RGBAFloat): RGBAFloat
}

const blendCache = new Map<BlendFn, ByteBlendAdapter>()

// Reusable scratch objects to prevent Garbage Collection pressure
const SRC_SCRATCH = { r: 0, g: 0, b: 0, a: 0 } as RGBAFloat
const DST_SCRATCH = { r: 0, g: 0, b: 0, a: 0 } as RGBAFloat

export function getBlendAdapter(fn: BlendFn) {
  let cached = blendCache.get(fn)
  if (cached === undefined) {
    cached = makeByteBlendAdapter(fn)
    blendCache.set(fn, cached)
  }
  return cached
}

export type ByteBlendAdapter = ReturnType<typeof makeByteBlendAdapter>

/**
 * High-performance adapter that avoids object allocation in the inner loop.
 */
export function makeByteBlendAdapter(blend: BlendFn) {
  return (
    srcData: Uint8ClampedArray,
    dstData: Uint8ClampedArray,
    si: number,
    di: number,
  ) => {
    // Inject values into persistent scratch objects instead of creating new ones
    SRC_SCRATCH.r = srcData[si] / 255
    SRC_SCRATCH.g = srcData[si + 1] / 255
    SRC_SCRATCH.b = srcData[si + 2] / 255
    SRC_SCRATCH.a = srcData[si + 3] / 255

    DST_SCRATCH.r = dstData[di] / 255
    DST_SCRATCH.g = dstData[di + 1] / 255
    DST_SCRATCH.b = dstData[di + 2] / 255
    DST_SCRATCH.a = dstData[di + 3] / 255

    const out = blend(SRC_SCRATCH, DST_SCRATCH)

    // Bitwise OR 0 is a faster way to truncate to integer than Math.round/floor
    dstData[di] = (out.r * 255 + 0.5) | 0
    dstData[di + 1] = (out.g * 255 + 0.5) | 0
    dstData[di + 2] = (out.b * 255 + 0.5) | 0
    dstData[di + 3] = (out.a * 255 + 0.5) | 0
  }
}


export const blendOverwrite: BlendFn = (src, dst) => {
  return src
}
blendOverwrite.alwaysClearFirst = true


export const blendIgnoreTransparent: BlendFn = (src, dst) => {
  return src.a === 0 ? dst : src
}

export const blendIgnoreSolid: BlendFn = (src, dst) => {
  return src.a === 1 ? dst : src
}


export function applyMask(source: ImageData, mask: Uint8Array): ImageData {
  const { width, height } = source
  // Create a copy to avoid mutating the original source pixels
  const destination = new ImageData(
    new Uint8ClampedArray(source.data),
    width,
    height,
  )

  const data32 = new Uint32Array(destination.data.buffer)

  for (let i = 0; i < data32.length; i++) {
    // If mask is 0 (transparent), wipe the pixel data
    if (mask[i] === 0) {
      data32[i] = 0
    }
  }

  return destination
}

