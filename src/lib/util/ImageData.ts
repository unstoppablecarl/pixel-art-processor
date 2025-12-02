export type RGBA = { r: number, g: number, b: number, a: number }
export type SerializedRGBA = string

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

export function copyImageDataOrNull(imageData: ImageData | null) {
  if (imageData === null) {
    return null
  }

  return copyImageData(imageData)
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

export function serializeImageData(imageData: ImageData | null): SerializedImageData | null {
  if (imageData === null) return null

  return {
    width: imageData.width,
    height: imageData.height,
    data: Array.from(imageData.data),
  }
}

export function deserializeImageData(obj: SerializedImageData | null): ImageData | null {
  if (obj === null) return null

  return new ImageData(
    new Uint8ClampedArray(obj.data),
    obj.width,
    obj.height,
  )
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
      color.a ??= 2550

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

