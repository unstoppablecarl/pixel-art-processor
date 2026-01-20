import { markRaw, type Raw, reactive, type Ref, shallowReactive, type ShallowReactive, watch } from 'vue'
import {
  deserializeImageData,
  resizeImageData,
  type SerializedImageData,
  serializeImageData,
} from '../util/html-dom/ImageData.ts'
import { type TileId, WangTileset } from '../wang-tiles/WangTileset.ts'

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
  readonly clearPixels: () => void,
  readonly serialize: () => Raw<SerializedImageData> | null,
  readonly setSerialized: (serialized: SerializedImageData | null) => void
  readonly deserializeConfig: <T extends SerializedImageData | null>(serialized: T) => T extends null ? null : Raw<T>
  readonly onChange: (value: Sync) => void
  readonly resize: (
    newWidth: number,
    newHeight: number,
    offsetX?: number,
    offsetY?: number,
  ) => void
}>

type Sync = (serialized: Raw<SerializedImageData> | null) => void

export function imageDataRef(initial: ImageData | null = null): ImageDataRef {
  if (initial) markRaw(initial)
  let image: ImageData | null = initial

  let sync: Sync | null = null
  const capsule: ImageDataRef = shallowReactive({
    hasValue: !!initial,
    width: initial?.width ?? 0,
    height: initial?.height ?? 0,
    watchTarget: 0,

    setQuiet(newValue: ImageData | null) {
      if (image === null && newValue === null) return
      if (!newValue) {
        image = null
        capsule.hasValue = false
        capsule.width = 0
        capsule.height = 0

        sync?.(serializeImageData(image))
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
        markRaw(image)
      }

      sync?.(serializeImageData(image))
    },
    resize(
      newWidth: number,
      newHeight: number,
      offsetX = 0,
      offsetY = 0,
    ) {
      if (!image) return
      const newImage = resizeImageData(image, newWidth, newHeight, offsetX, offsetY)
      capsule.set(newImage)
    },
    clear() {
      if (!image) return

      image = null
      capsule.hasValue = false
      capsule.width = 0
      capsule.height = 0
      capsule.watchTarget++
      sync?.(null)
    },
    clearPixels() {
      if (!image) return
      image.data.fill(0)
    },
    set(newValue: ImageData | null) {
      if (image === null && newValue === null) return
      capsule.setQuiet(newValue)
      capsule.watchTarget++
    },
    get() {
      return image
    },
    triggerRef() {
      capsule.watchTarget++
    },
    onChange(value: Sync) {
      sync = value
    },
    serialize: () => serializeImageData(image),
    setSerialized(serialized: SerializedImageData | null) {
      capsule.set(deserializeImageData(serialized))
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

export function tilesetSyncedImageDataRef<T>(tileset: Ref<WangTileset<T>>) {
  const tilesetImageRefs = reactive<Record<TileId, ImageDataRef>>({})

  watch(tileset, (newTileset) => {
    const newIds = new Set(newTileset.tiles.map(t => t.id))

    for (const id in tilesetImageRefs) {
      if (!newIds.has(id as TileId)) {
        delete tilesetImageRefs[id as TileId]
      }
    }

    for (const tile of newTileset.tiles) {
      if (!(tile.id in tilesetImageRefs)) {
        tilesetImageRefs[tile.id] = imageDataRef()
      }
    }
  }, { immediate: true })

  return tilesetImageRefs
}

// export function imageDataRefComputed<T extends ImageData | null>(source: WatchSource<T>): ImageDataRef {
//   const ref = imageDataRef()
//   watch(source, (newImageData) => ref.set(newImageData))
//
//   return ref
// }