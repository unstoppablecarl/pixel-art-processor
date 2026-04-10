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

  readonly get: () => PixelData,
  readonly getImageData: () => ImageData | null,
  readonly copy: () => PixelData,
  readonly set: (newValue: ImageData | null) => void,

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
  const empty = { width: 0, height: 0, data: new Uint8ClampedArray(0) } as ImageData

  const image: PixelData = initial ?? makePixelData(empty)
  markRaw(image)

  const capsule: PixelDataRef = shallowReactive({
    __isPixelDataRef: true,
    hasValue: !!initial,
    width: initial?.w ?? 0,
    height: initial?.h ?? 0,
    watchTarget: 0,

    setQuiet(newValue: PixelData | null) {
      if (image.imageData === empty && newValue === null) return
      if (!newValue) {
        setPixelData(image, empty)
        capsule.hasValue = false
        capsule.width = 0
        capsule.height = 0
        return
      }

      if (
        image.w === newValue.w &&
        image.h === newValue.h
      ) {

        image.data.set(newValue.data)
      } else {
        setPixelData(image, newValue.imageData)

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
      if (image.imageData === empty) {
        setPixelData(image, new ImageData(newWidth, newHeight))
        return
      }
      if (image.w === newWidth && image.h === newHeight) return

      const newImage = resizeImageData(image.imageData as ImageData, newWidth, newHeight, offsetX, offsetY)
      capsule.set(newImage)
    },
    destructiveResize(
      newWidth: number,
      newHeight: number,
    ) {
      if (image.imageData === empty) {
        capsule.set(new ImageData(newWidth, newHeight))
        return
      }
      if (image.w === newWidth && image.h === newHeight) return

      capsule.set(new ImageData(newWidth, newHeight))
    },
    clear() {
      if (image.imageData === empty) return

      capsule.set(null)
    },
    clearPixels() {
      if (image.imageData === empty) return
      image.data.fill(0)
      capsule.watchTarget++
    },
    set(newValue: ImageData | null) {
      if (image.imageData === empty && newValue === null) return

      const val = newValue ?? empty
      setPixelData(image, val)

      capsule.hasValue = val !== empty
      capsule.width = image.w
      capsule.height = image.h
      capsule.watchTarget++
    },
    get() {
      return image
    },
    getImageData() {
      return image.imageData === empty ? null : image.imageData
    },
    triggerRef() {
      capsule.watchTarget++
    },
    copy: () => copyPixelData(image),
    serialize: () => {
      if (image.imageData === empty) return null
      return serializeImageData(image.imageData)
    },
    setSerialized(serialized: SerializedImageData | null) {
      const imageData = deserializeImageData(serialized)
      capsule.set(imageData)
    },
    // set the capsule value and mark the serialized obj raw so it can be safely set to the config object
    deserializeConfig<T extends SerializedImageData | null>(serialized: T): T extends null ? null : Raw<T> {
      capsule.set(deserializeImageData(serialized))
      if (!serialized) return null as any
      return markRaw(serialized) as any
    },
  })

  return capsule
}