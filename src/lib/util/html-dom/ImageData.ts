import {
  deserializeNullableImageData,
  type ImageDataLike,
  imageDataToImgBlob,
  type SerializedImageData,
  serializeNullableImageData,
} from 'pixel-data-js'
import { markRaw, type Raw } from 'vue'
import { applyMask } from './blit.ts'

export function imageElementToImageData(img: HTMLImageElement): ImageData {
  const canvas = new OffscreenCanvas(img.width, img.height)
  const ctx = canvas.getContext('2d')!

  ctx.drawImage(img, 0, 0)

  return ctx.getImageData(0, 0, canvas.width, canvas.height)
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

export function serializeImageData<T extends ImageDataLike | null>(imageData: T): T extends null ? null : Raw<SerializedImageData> {
  if (!imageData) return null as any

  const serialized = serializeNullableImageData(imageData)
  return markRaw(serialized) as any
}

export function deserializeImageData<T extends SerializedImageData | null>(obj: T): T extends null ? null : Raw<ImageData> {
  if (!obj) return null as any

  return markRaw(deserializeNullableImageData(obj)) as any
}

export async function imageDataToPngBlob(
  imageData: ImageData,
  mask: Uint8Array | null = null,
): Promise<Blob> {

  const img = mask ? applyMask(imageData, mask) : imageData

  return imageDataToImgBlob(img)
}