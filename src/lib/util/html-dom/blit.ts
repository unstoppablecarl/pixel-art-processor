import { type RGBAFloat } from './ImageData.ts'
import { makeReusablePixelCanvas } from './PixelCanvas.ts'

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

export const blendSourceAlphaOver = (alpha: number): BlendFn => (src, dst) => {
  if (src.a === 0) return dst

  const srcA = alpha * src.a
  const outA = srcA + dst.a * (1 - srcA)

  if (outA === 0) return { r: 0, g: 0, b: 0, a: 0 } as RGBAFloat

  return {
    r: (src.r * srcA + dst.r * dst.a * (1 - srcA)) / outA,
    g: (src.g * srcA + dst.g * dst.a * (1 - srcA)) / outA,
    b: (src.b * srcA + dst.b * dst.a * (1 - srcA)) / outA,
    a: outA,
  } as RGBAFloat
}

export const blendOverwrite: BlendFn = (src, dst) => {
  return src
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
  let {
    dx = 0, dy = 0,
    sx = 0, sy = 0,
    sw = src.width, sh = src.height,
    blendMode = blendOverwrite,
    mask,
  } = opts

  // Store the original sx/sy before clipping to calculate mask offset
  const originalSx = sx;
  const originalSy = sy;

  // 1. Clip Source Area
  if (sx < 0) { dx -= sx; sw += sx; sx = 0; }
  if (sy < 0) { dy -= sy; sh += sy; sy = 0; }
  sw = Math.min(sw, src.width - sx);
  sh = Math.min(sh, src.height - sy);

  // 2. Clip Destination Area
  if (dx < 0) { sx -= dx; sw += dx; dx = 0; }
  if (dy < 0) { sy -= dy; sh += dy; dy = 0; }
  const actualW = Math.min(sw, dst.width - dx);
  const actualH = Math.min(sh, dst.height - dy);

  if (actualW <= 0 || actualH <= 0) return;

  // --- STANDARD PATH ---
  const byteBlend = getBlendAdapter(blendMode);
  const dstData = dst.data;
  const srcData = src.data;
  const useMask = !!mask;

  // If the mask corresponds to the original requested sw/sh:
  // We need to know how far into the mask we have shifted due to clipping.
  const maskOffsetX = sx - originalSx;
  const maskOffsetY = sy - originalSy;
  const maskStride = opts.sw || src.width; // The width of the mask array

  for (let iy = 0; iy < actualH; iy++) {
    const dstRow = (iy + dy) * dst.width;
    const srcRow = (iy + sy) * src.width;

    // The mask row must account for the vertical clipping offset
    const maskRow = (iy + maskOffsetY) * maskStride;

    for (let ix = 0; ix < actualW; ix++) {
      // The mask index must account for the horizontal clipping offset
      if (useMask && mask![(maskRow + (ix + maskOffsetX))] === 0) continue;

      const di = (dstRow + (ix + dx)) << 2;
      const si = (srcRow + (ix + sx)) << 2;

      byteBlend(srcData, dstData, si, di);
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

const imageDataToPngBlob_pixelCanvas = makeReusablePixelCanvas()

export async function imageDataToPngBlob(
  imageData: ImageData,
  mask: Uint8Array | null = null,
): Promise<Blob> {
  const { canvas, ctx } = imageDataToPngBlob_pixelCanvas(imageData.width, imageData.height)

  const finalData = mask ? applyMask(imageData, mask) : imageData

  ctx.putImageData(finalData, 0, 0)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Failed to generate PNG blob'))
    }, 'image/png')
  })
}