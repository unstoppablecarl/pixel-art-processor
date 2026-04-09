import {
  copyPixelData,
  makePixelData,
  PixelData,
  resizeImageData,
  type SerializedImageData,
  setPixelData,
} from 'pixel-data-js'
import { markRaw, type Raw, shallowReactive, type ShallowReactive } from 'vue'
import { deserializeImageData, serializeImageData } from '../util/html-dom/ImageData.ts'

export type PixelDataOrRef = null | PixelData | PixelDataRef;

export type PixelDataRef = ShallowReactive<{
  __isPixelDataRef: true,
  hasValue: boolean,
  watchTarget: number,
  width: number,
  height: number,

  readonly get: () => PixelData | null,
  readonly getImageData: () => ImageData | null,
  readonly copy: () => PixelData | null,
  readonly set: (newValue: PixelData | null) => void,
  readonly setImageData: (newValue: ImageData | null) => void,

  readonly setQuiet: (newValue: PixelData | null) => void,

  readonly triggerRef: () => void,
  readonly clear: () => void,
  readonly clearPixels: () => void,
  readonly serialize: () => Raw<SerializedImageData> | null,
  readonly setSerialized: (serialized: SerializedImageData | null) => void
  readonly deserializeConfig: <T extends SerializedImageData | null>(serialized: T) => T extends null ? null : Raw<T>
  readonly resize: (
    newWidth: number,
    newHeight: number,
    offsetX?: number,
    offsetY?: number,
  ) => void
  readonly destructiveResize: (
    newWidth: number,
    newHeight: number,
  ) => void
}>

export function pixelDataRef(initial: PixelData | null = null): PixelDataRef {
  if (initial) markRaw(initial)
  let image: PixelData | null = initial

  const capsule: PixelDataRef = shallowReactive({
    __isPixelDataRef: true,
    hasValue: !!initial,
    width: initial?.w ?? 0,
    height: initial?.h ?? 0,
    watchTarget: 0,

    setQuiet(newValue: PixelData | null) {
      if (image === null && newValue === null) return
      if (!newValue) {
        image = null
        capsule.hasValue = false
        capsule.width = 0
        capsule.height = 0

        return
      }

      if (image &&
        image.w === newValue.w &&
        image.h === newValue.h) {

        image.data.set(newValue.data)
      } else {
        image = newValue
        markRaw(image)
        capsule.hasValue = true
        capsule.width = newValue.w
        capsule.height = newValue.h
      }
    },
    resize(
      newWidth: number,
      newHeight: number,
      offsetX = 0,
      offsetY = 0,
    ) {
      if (!image) {
        capsule.set(makePixelData(new ImageData(newWidth, newHeight)))
        return
      }
      if (image.w === newWidth && image.h === newHeight) return

      const newImage = resizeImageData(image.imageData as ImageData, newWidth, newHeight, offsetX, offsetY)
      setPixelData(image, newImage)
      capsule.set(image)
    },
    destructiveResize(
      newWidth: number,
      newHeight: number,
    ) {
      if (!image) {
        capsule.set(makePixelData(new ImageData(newWidth, newHeight)))
        return
      }
      if (image.w === newWidth && image.h === newHeight) return

      setPixelData(image, new ImageData(newWidth, newHeight))
      capsule.set(image)
    },
    clear() {
      if (!image) return

      image = null
      capsule.hasValue = false
      capsule.width = 0
      capsule.height = 0
      capsule.watchTarget++
    },
    clearPixels() {
      if (!image) return
      image.data.fill(0)
      capsule.watchTarget++
    },
    set(newValue: PixelData | null) {
      if (image === null && newValue === null) return
      capsule.setQuiet(newValue)
      capsule.watchTarget++
    },
    setImageData(newValue: ImageData | null) {
      if (newValue === null) {
        capsule.set(null)
        return
      }

      if (!image) {
        capsule.set(makePixelData(newValue))
        return
      }

      setPixelData(image, newValue)
      capsule.set(image)
    },
    get() {
      return image
    },
    getImageData() {
      return image?.imageData ?? null
    },
    triggerRef() {
      capsule.watchTarget++
    },
    copy: () => image ? copyPixelData(image) : null,
    serialize: () => serializeImageData(image?.imageData ?? null),
    setSerialized(serialized: SerializedImageData | null) {
      const imageData = deserializeImageData(serialized)
      capsule.setImageData(imageData)
    },
    // set the capsule value and mark the serialized obj raw so it can be safely set to the config object
    deserializeConfig<T extends SerializedImageData | null>(serialized: T): T extends null ? null : Raw<T> {
      capsule.setImageData(deserializeImageData(serialized))
      if (!serialized) return null as any
      return markRaw(serialized) as any
    },
  })

  return capsule
}