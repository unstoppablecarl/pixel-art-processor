import { markRaw, type Raw } from 'vue'
import type { Point } from '../../node-data-types/BaseDataStructure.ts'
import { makeReusablePixelCanvas } from '../misc.ts'
import { type BlendFn, makeByteBlendAdapter } from './blit.ts'

// ALL values are 0-255 (including alpha which in CSS is 0-1)
export type RGBA = { r: number, g: number, b: number, a: number }
// ALL values are 0-1
export type RGBAFloat = { r: number, g: number, b: number, a: number, readonly __brandRGBAFloat: unique symbol }
export type SerializedRGBA = string

export const RGBA_ERASE = { r: 0, g: 0, b: 0, a: 0 } as Readonly<RGBA>
export const RGBA_WHITE = { r: 255, g: 255, b: 255, a: 255 } as Readonly<RGBA>

export function serializeRGBA({ r, g, b, a }: RGBA): SerializedRGBA {
  return `${r},${g},${b},${a}`
}

export function imageToCanvas(img: HTMLImageElement): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  imageData: ImageData
} {
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
  ctx.drawImage(img, 0, 0)
  return {
    canvas,
    ctx,
    imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
  }
}

export function imageDataToUrlImage(imgData: ImageData): string {
  const canvas = document.createElement('canvas')
  canvas.width = imgData.width
  canvas.height = imgData.height
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
  ctx.putImageData(imgData, 0, 0)
  return canvas.toDataURL()
}

export function fillNonTransparentPixels(imageData: ImageData, grayScale: number = 0): ImageData {
  for (let i = 0; i < imageData.data.length; i += 4) {
    let currentAlpha = imageData.data[i + 3]!
    if (currentAlpha > 0) {
      imageData.data[i] = grayScale
      imageData.data[i + 1] = grayScale
      imageData.data[i + 2] = grayScale
      imageData.data[i + 3] = 255
    }
  }
  return imageData
}

export function fillTransparentPixels(imageData: ImageData, grayScale: number = 0): ImageData {
  for (let i = 0; i < imageData.data.length; i += 4) {
    let currentAlpha = imageData.data[i + 3]!
    if (currentAlpha === 0) {
      imageData.data[i] = grayScale
      imageData.data[i + 1] = grayScale
      imageData.data[i + 2] = grayScale
      imageData.data[i + 3] = 255
    }
  }
  return imageData
}

export function copyImageData(imageData: ImageData) {
  if (!(imageData instanceof ImageData)) {
    throw new Error('imageData must be an ImageData object or null')
  }

  const dataCopy = new Uint8ClampedArray(imageData.data)

  return new ImageData(dataCopy, imageData.width, imageData.height)
}

export function invertImageData(imageData: ImageData) {
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i]!
    data[i + 1] = 255 - data[i + 1]!
    data[i + 2] = 255 - data[i + 2]!
  }
  return imageData
}

export type SerializedImageData = {
  width: number,
  height: number,
  data: number[],
}

export function serializeImageData<T extends ImageData | null>(imageData: T): T extends null ? null : Raw<SerializedImageData> {
  if (imageData === null) return null as any
  if (imageData.width === 0 && imageData.height === 0 && imageData.data.length === 0) return null as any

  return markRaw({
    width: imageData.width,
    height: imageData.height,
    data: Array.from(imageData.data),
  }) as any
}

export function deserializeImageData<T extends SerializedImageData | null>(obj: T): T extends null ? null : Raw<ImageData> {
  if (obj === null) return null as any
  if (!obj?.width && !obj?.height && (!obj?.data?.length)) return null as any

  return markRaw(new ImageData(
    new Uint8ClampedArray(obj.data),
    obj.width,
    obj.height,
  )) as any
}

export function eachImageDataPixel(
  imageData: ImageData,
  cb: (x: number, y: number, color: RGBA) => void,
) {
  const { width, height } = imageData

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      cb(x, y, getImageDataPixelColor(imageData, x, y))
    }
  }
}

export function updateImageData(
  imageData: ImageData,
  cb: (x: number, y: number, color: RGBA) => RGBA,
): ImageData {
  const { width, height, data } = imageData

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {

      const index = (y * width + x) * 4

      const color = cb(x, y, getImageDataPixelColor(imageData, x, y))

      color.r ??= 0
      color.g ??= 0
      color.b ??= 0
      color.a ??= 255

      data[index] = color.r
      data[index + 1] = color.g
      data[index + 2] = color.b
      data[index + 3] = color.a
    }
  }

  return imageData
}

export function getImageDataPixelColor(imageData: ImageData, x: number, y: number): RGBA {
  const index = (y * imageData.width + x) * 4

  return {
    r: imageData.data[index]!,
    g: imageData.data[index + 1]!,
    b: imageData.data[index + 2]!,
    a: imageData.data[index + 3]!,
  }
}

export function setImageDataPixelColor(imageData: ImageData, x: number, y: number, { r, g, b, a }: RGBA) {
  const index = (y * imageData.width + x) * 4
  imageData.data[index] = r
  imageData.data[index + 1] = g
  imageData.data[index + 2] = b
  imageData.data[index + 3] = a
}

export function setImageDataPixelsColor(imageData: ImageData, points: Point[], color: RGBA) {
  for (let i = 0; i < points.length; i++) {
    const { x, y } = points[i]
    setImageDataPixelColor(imageData, x, y, color)
  }
}

export function fillImageData(
  imageData: ImageData,
  color: RGBA,
): ImageData {

  const { width, height, data } = imageData

  for (let i = 0; i < width * height; i++) {
    data[i * 4] = color.r
    data[i * 4 + 1] = color.g
    data[i * 4 + 2] = color.b
    data[i * 4 + 3] = color.a
  }

  return imageData
}

export function resizeImageData(
  current: ImageData,
  newWidth: number,
  newHeight: number,
  offsetX = 0,
  offsetY = 0,
): ImageData {
  const result = new ImageData(newWidth, newHeight)
  const oldData = current.data
  const newData = result.data

  const oldW = current.width
  const oldH = current.height

  for (let y = 0; y < oldH; y++) {
    for (let x = 0; x < oldW; x++) {
      const newX = x + offsetX
      const newY = y + offsetY

      if (newX < 0 || newY < 0 || newX >= newWidth || newY >= newHeight) {
        continue
      }

      const oldIndex = (y * oldW + x) * 4
      const newIndex = (newY * newWidth + newX) * 4

      newData[newIndex] = oldData[oldIndex]
      newData[newIndex + 1] = oldData[oldIndex + 1]
      newData[newIndex + 2] = oldData[oldIndex + 2]
      newData[newIndex + 3] = oldData[oldIndex + 3]
    }
  }

  return result
}

export function imageDataEqual(
  a: ImageData | SerializedImageData | null,
  b: ImageData | SerializedImageData | null,
): boolean {
  if (a === null || b === null) return a === b
  if (a.width !== b.width || a.height !== b.height) return false

  const ad = a.data
  const bd = b.data

  if (ad.length !== bd.length) return false

  for (let i = 0; i < ad.length; i++) {
    if (ad[i] !== bd[i]) return false
  }

  return true
}

export function writeImageData(
  target: ImageData,
  source: ImageData,
  x: number,
  y: number,
  sx: number = 0,
  sy: number = 0,
  sw: number = source.width,
  sh: number = source.height,
) {
  const dstData = target.data
  const srcData = source.data
  const dstW = target.width
  const srcW = source.width

  for (let iy = 0; iy < sh; iy++) {
    const dstRow = (iy + y) * dstW
    const srcRow = (iy + sy) * srcW

    for (let ix = 0; ix < sw; ix++) {
      const di = (dstRow + (ix + x)) * 4
      const si = (srcRow + (ix + sx)) * 4

      dstData[di] = srcData[si]
      dstData[di + 1] = srcData[si + 1]
      dstData[di + 2] = srcData[si + 2]
      dstData[di + 3] = srcData[si + 3]
    }
  }
}

const pixelCanvas = makeReusablePixelCanvas()
const getTmpImageData = makeReusableImageData()

export function putImageDataScaled(
  target: CanvasRenderingContext2D,
  width: number,
  height: number,
  imageData: ImageData,
  x = 0,
  y = 0,
  blend?: BlendFn,
) {

  const { canvas, ctx } = pixelCanvas(width, height)

  if (!blend) {
    // Fast path: no blending
    ctx.putImageData(imageData, 0, 0)
  } else {
    // Blended path
    const tmp = getTmpImageData(width, height)
    const dst = tmp.data
    const src = imageData.data

    const byteBlend = makeByteBlendAdapter(blend)

    for (let i = 0; i < src.length; i += 4) {
      byteBlend(src, dst, i, i)
    }

    ctx.putImageData(tmp, 0, 0)
  }

  target.drawImage(canvas, x, y)
}

export function extractImageData(
  src: ImageData,
  x: number,
  y: number,
  w: number,
  h: number,
): ImageData {
  const out = new Uint8ClampedArray(w * h * 4)
  const srcData = src.data
  const srcW = src.width

  for (let iy = 0; iy < h; iy++) {
    const srcRow = (y + iy) * srcW
    const dstRow = iy * w

    for (let ix = 0; ix < w; ix++) {
      const srcIndex = (srcRow + (x + ix)) * 4
      const dstIndex = (dstRow + ix) * 4

      out[dstIndex] = srcData[srcIndex]
      out[dstIndex + 1] = srcData[srcIndex + 1]
      out[dstIndex + 2] = srcData[srcIndex + 2]
      out[dstIndex + 3] = srcData[srcIndex + 3]
    }
  }

  return new ImageData(out, w, h)
}

export function clearImageDataRect(
  img: ImageData,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  fillImageDataRect(img, x, y, w, h, RGBA_ERASE)
}

export function fillImageDataRect(
  img: ImageData,
  x: number,
  y: number,
  w: number,
  h: number,
  { r, g, b, a }: RGBA,
) {
  const data = img.data
  const width = img.width
  const height = img.height

  // clamp to bounds
  const startX = Math.max(0, x)
  const startY = Math.max(0, y)
  const endX = Math.min(width, x + w)
  const endY = Math.min(height, y + h)

  for (let iy = startY; iy < endY; iy++) {
    const row = iy * width
    for (let ix = startX; ix < endX; ix++) {
      const idx = (row + ix) * 4

      data[idx] = r
      data[idx + 1] = g
      data[idx + 2] = b
      data[idx + 3] = a
    }
  }
}

export function makeReusableImageData() {
  let imageData: ImageData | null = null
  let buffer: Uint8ClampedArray | null = null

  return function getReusableImageData(width: number, height: number) {
    const size = width * height * 4

    // Allocate or resize if needed
    if (!buffer || buffer.length !== size) {
      buffer = new Uint8ClampedArray(size)
      imageData = new ImageData(buffer as ImageDataArray, width, height)
    }

    // If size matches, we reuse the buffer as-is.
    // Caller can clear or overwrite only what they need.
    return imageData!
  }
}

