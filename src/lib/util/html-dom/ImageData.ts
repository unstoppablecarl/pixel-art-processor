import { markRaw, type Raw } from 'vue'
import type { SelectionRect } from '../../../components/CanvasEditor/TileGridEdit/lib/ISelection.ts'
import type { Point } from '../../node-data-types/BaseDataStructure.ts'
import { colorDistance } from '../color.ts'
import { type Rect, trimRectBounds } from '../data/Rect.ts'
import { type BlendFn, getBlendAdapter } from './blit.ts'
import { makeReusablePixelCanvas } from './PixelCanvas.ts'

export type ReadonlyImageData = {
  readonly width: number
  readonly height: number
  readonly data: Uint8ClampedArray
}

export function imageElementToImageData(img: HTMLImageElement): ImageData {
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D

  ctx.drawImage(img, 0, 0)

  return ctx.getImageData(0, 0, canvas.width, canvas.height)
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

export function setImageDataPixelColors(imageData: ImageData, pixels: PixelColor[]) {
  for (let i = 0; i < pixels.length; i++) {
    const { x, y, color } = pixels[i]
    setImageDataPixelColor(imageData, x, y, color)
  }
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
  mask?: Uint8Array | null,
) {
  const dstData = target.data
  const srcData = source.data
  const dstW = target.width
  const srcW = source.width

  const useMask = !!mask

  for (let iy = 0; iy < sh; iy++) {
    const dstRow = (iy + y) * dstW
    const srcRow = (iy + sy) * srcW

    for (let ix = 0; ix < sw; ix++) {
      if (useMask && mask![iy * sw + ix] === 0) continue

      const di = (dstRow + (ix + x)) * 4
      const si = (srcRow + (ix + sx)) * 4

      dstData[di] = srcData[si]
      dstData[di + 1] = srcData[si + 1]
      dstData[di + 2] = srcData[si + 2]
      dstData[di + 3] = srcData[si + 3]
    }
  }
}

export interface PutImageDataOptions {
  dx?: number
  dy?: number

  // source cropping
  sx?: number
  sy?: number
  sw?: number
  sh?: number

  blendMode?: BlendFn

  // mask (1 = write, 0 = skip)
  mask?: Uint8Array | null
}

const pixelCanvas = makeReusablePixelCanvas()
const getTmpImageData = makeReusableImageData()

export function putImageData(
  target: CanvasRenderingContext2D,
  imageData: ImageData,
  opts: PutImageDataOptions = {},
) {
  const {
    dx = 0,
    dy = 0,
    blendMode,
    sx = 0,
    sy = 0,
    sw = imageData.width,
    sh = imageData.height,
    mask,
  } = opts

  const fullWidth = sw === imageData.width
  const fullHeight = sh === imageData.height
  const atOrigin = sx === 0 && sy === 0

  // Extract region if needed
  const src = (fullWidth && fullHeight && atOrigin)
    ? imageData
    : extractImageData(imageData, sx, sy, sw, sh)

  const { width, height } = src

  if (blendMode?.alwaysClearFirst) {
    if (!mask) {
      // Fast path: clear entire destination rect
      target.clearRect(dx, dy, width, height)
    } else {
      // Masked clear: clear only pixels where mask = 1
      const clearImg = target.getImageData(dx, dy, width, height)
      const cdata = clearImg.data

      for (let iy = 0; iy < height; iy++) {
        for (let ix = 0; ix < width; ix++) {
          const mi = iy * width + ix   // rect-local mask index
          if (mask[mi] === 0) continue

          const idx = (iy * width + ix) * 4
          cdata[idx] = 0
          cdata[idx + 1] = 0
          cdata[idx + 2] = 0
          cdata[idx + 3] = 0
        }
      }

      target.putImageData(clearImg, dx, dy)
    }
  }

  const { canvas, ctx } = pixelCanvas(width, height)

  if (!blendMode && !mask) {
    ctx.putImageData(src, 0, 0)
    target.drawImage(canvas, dx, dy)
    return
  }

  const tmp = getTmpImageData(width, height)
  const dst = tmp.data
  const sdata = src.data
  const byteBlend = blendMode ? getBlendAdapter(blendMode) : null

  for (let iy = 0; iy < height; iy++) {
    for (let ix = 0; ix < width; ix++) {
      const mi = iy * width + ix   // rect-local mask index
      if (mask && mask[mi] === 0) continue

      const i = (iy * width + ix) * 4

      if (!byteBlend) {
        dst[i] = sdata[i]
        dst[i + 1] = sdata[i + 1]
        dst[i + 2] = sdata[i + 2]
        dst[i + 3] = sdata[i + 3]
      } else {
        byteBlend(sdata, dst, i, i)
      }
    }
  }

  ctx.putImageData(tmp, 0, 0)
  target.drawImage(canvas, dx, dy)
}

export function extractImageData(
  src: ImageData,
  rect: Rect,
): ImageData
export function extractImageData(
  src: ImageData,
  x: number,
  y: number,
  w: number,
  h: number,
): ImageData
export function extractImageData(
  src: ImageData,
  _x: Rect | number,
  _y?: number,
  _w?: number,
  _h?: number,
): ImageData {
  const { x, y, w, h } = typeof _x === 'object'
    ? _x
    : { x: _x, y: _y!, w: _w!, h: _h! }

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

export function clearImageData(
  target: ImageData,
  x: number,
  y: number,
  w: number,
  h: number,
  mask?: Uint8Array | null,
) {
  fillImageData(target, RGBA_ERASE, x, y, w, h, mask)
}

export function fillImageData(
  target: ImageData,
  { r, g, b, a }: RGBA,
  x = 0,
  y = 0,
  w = target.width,
  h = target.height,
  mask?: Uint8Array | null,
) {
  const { width, height } = target

  // Clamp to bounds
  const startX = Math.max(0, x)
  const startY = Math.max(0, y)
  const endX = Math.min(width, x + w)
  const endY = Math.min(height, y + h)

  if (startX >= endX || startY >= endY) return

  const data = target.data
  const useMask = !!mask

  // Actual region size after clamping
  const regionWidth = endX - startX
  const regionHeight = endY - startY

  for (let iy = 0; iy < regionHeight; iy++) {
    for (let ix = 0; ix < regionWidth; ix++) {

      const mi = iy * w + ix
      if (useMask && mask![mi] === 0) continue

      const di = ((startY + iy) * width + (startX + ix)) * 4

      data[di] = r
      data[di + 1] = g
      data[di + 2] = b
      data[di + 3] = a
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

export type FloodFillResult = {
  startX: number,
  startY: number,
  selectionRect: SelectionRect
  pixels: ImageData
}

export function floodFillImageDataSelection(
  img: ImageData,
  startX: number,
  startY: number,
  contiguous = true,
  tolerance = 0,
  bounds?: Rect,
): FloodFillResult | null {
  if (!img) return null

  const w = img.width
  const h = img.height

  // Define the effective search area
  const limit = bounds || { x: 0, y: 0, w, h }
  const xMinLimit = Math.max(0, limit.x)
  const xMaxLimit = Math.min(w - 1, limit.x + limit.w - 1)
  const yMinLimit = Math.max(0, limit.y)
  const yMaxLimit = Math.min(h - 1, limit.y + limit.h - 1)

  // Early exit if start point is outside the provided bounds
  if (startX < xMinLimit || startX > xMaxLimit || startY < yMinLimit || startY > yMaxLimit) {
    return null
  }

  const visited = new Uint8Array(w * h)
  const queue: [number, number][] = []
  const baseColor = getImageDataPixelColor(img, startX, startY)

  queue.push([startX, startY])
  visited[startY * w + startX] = 1

  let minX = startX, maxX = startX
  let minY = startY, maxY = startY

  const matches: [number, number][] = []

  if (contiguous) {
    while (queue.length) {
      const [x, y] = queue.pop()!
      matches.push([x, y])

      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y

      const neighbors = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]

      for (const [nx, ny] of neighbors) {
        // Check against the calculated limits instead of just image dimensions
        if (nx < xMinLimit || ny < yMinLimit || nx > xMaxLimit || ny > yMaxLimit) continue

        const idx = ny * w + nx
        if (visited[idx]) continue

        const c = getImageDataPixelColor(img, nx, ny)
        if (colorDistance(c, baseColor) <= tolerance) {
          visited[idx] = 1
          queue.push([nx, ny])
        }
      }
    }
  } else {
    // Non-contiguous mode: scan only within the limits
    for (let y = yMinLimit; y <= yMaxLimit; y++) {
      for (let x = xMinLimit; x <= xMaxLimit; x++) {
        const c = getImageDataPixelColor(img, x, y)
        if (colorDistance(c, baseColor) <= tolerance) {
          matches.push([x, y])
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }
  }

  if (matches.length === 0) return null

  const rect: Rect = {
    x: minX,
    y: minY,
    w: maxX - minX + 1,
    h: maxY - minY + 1,
  }

  // Final safety trim against image dimensions
  trimRectBounds(rect, { x: 0, y: 0, w, h })

  const pixels = extractImageData(img, rect.x, rect.y, rect.w, rect.h)
  const mask = new Uint8Array(rect.w * rect.h)

  for (const [x, y] of matches) {
    const mx = x - rect.x
    const my = y - rect.y
    mask[my * rect.w + mx] = 1
  }

  return { startX, startY, selectionRect: { ...rect, mask }, pixels }
}

// array of 1 | 0 values. 1 is selected in the mask
// mask uses normal pixel indexing i = y * width + x
// export type PixelMask = Uint8Array