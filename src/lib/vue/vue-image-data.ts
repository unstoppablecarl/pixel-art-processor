import { shallowReactive, type ShallowReactive } from 'vue'
import { deserializeImageData, type SerializedImageData, serializeImageData } from '../util/html-dom/ImageData.ts'

export function normalizeImageData(value: ImageDataOrRef): ImageData | null {
  if (!value) return null
  if (value instanceof ImageData) return value
  return value.get()
}

export type ImageDataOrRef = null | ImageData | ImageDataRef;

export type ImageDataRef = ShallowReactive<{
  hasValue: boolean,
  watchTarget: number,
  width: number,
  height: number,

  readonly get: () => ImageData | null,

  readonly set: (newValue: ImageData | null) => void,
  readonly setQuiet: (newValue: ImageData | null) => void,

  readonly triggerRef: () => void,
  readonly clear: () => void,
  readonly serialize: () => SerializedImageData | null,
  readonly setSerialized: (serialized: SerializedImageData | null) => void
}>

export function imageDataRef(initial: ImageData | null = null): ImageDataRef {
  let image: ImageData | null = initial

  const capsule = shallowReactive({
    hasValue: !!initial,
    width: initial?.width ?? 0,
    height: initial?.height ?? 0,
    watchTarget: 0,
    setQuiet(newValue: ImageData | null) {
      if (!newValue) {
        image = null
        capsule.hasValue = false
        capsule.width = 0
        capsule.height = 0
        return
      }

      if (image &&
        image.width === newValue.width &&
        image.height === newValue.height) {

        if (image.data.length !== newValue.data.length) {
          const msg = 'malformed ImageData object'
          console.error(msg, newValue)
          throw new Error(msg)
        }

        image.data.set(newValue.data)
      } else {
        // Update dimensions immediately
        capsule.hasValue = true
        capsule.width = newValue.width
        capsule.height = newValue.height
        image = newValue
      }
    },
    clear() {
      if (!image) return

      image = null
      capsule.hasValue = false
      capsule.width = 0
      capsule.height = 0
      capsule.watchTarget++
    },
    set(newValue: ImageData | null) {
      capsule.setQuiet(newValue)
      capsule.watchTarget++
    },
    get() {
      return image
    },
    triggerRef() {
      capsule.watchTarget++
    },
    serialize: () => serializeImageData(image),
    setSerialized(serialized: SerializedImageData | null) {
      image = deserializeImageData(serialized)
    },
  })

  return capsule
}
