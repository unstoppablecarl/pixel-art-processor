import {
  computed,
  customRef,
  isProxy,
  isReactive,
  isReadonly,
  isRef,
  type Ref,
  shallowRef,
  toRaw,
  toValue,
  triggerRef,
  type UnwrapNestedRefs,
  type UnwrapRef,
} from 'vue'
import { StepValidationError } from '../pipeline/errors/StepValidationError.ts'
import type { imageDataToUrlImage } from './ImageData.ts'

export function deepUnwrap<T>(value: T, visited: Map<unknown, unknown> = new Map()): UnwrapNestedRefs<UnwrapRef<T>> {
  let rawValue: unknown = value
  if (isRef(value)) {
    rawValue = toValue(value)
  } else if (isProxy(value) && (isReactive(value) || isReadonly(value))) {
    rawValue = toRaw(value)
  }

  if (visited.has(rawValue)) {
    return visited.get(rawValue) as UnwrapNestedRefs<UnwrapRef<T>>
  }

  if (!isPlainObject(rawValue) && !Array.isArray(rawValue)) {
    return rawValue as UnwrapNestedRefs<UnwrapRef<T>>
  }

  const result: any = Array.isArray(rawValue) ? [] : {}

  visited.set(rawValue, result)

  if (Array.isArray(rawValue)) {
    rawValue.forEach((item, index) => {
      result[index] = deepUnwrap(item as any, visited)
    })
  } else {
    for (const key in rawValue) {
      if (Object.prototype.hasOwnProperty.call(rawValue, key)) {
        result[key] = deepUnwrap((rawValue as any)[key], visited)
      }
    }
  }

  return result as UnwrapNestedRefs<UnwrapRef<T>>
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && !isProxy(value) && !isRef(value)
}

// only triggers on myArray.value[3] = { foo: 'bar' }
// not myArray.value[3].foo = 'something'
export function shallowArrayItemsRef<T>(value: T[]): Ref<T[]> {
  return customRef<T[]>((track, trigger) => ({
    get() {
      track()
      return new Proxy(value, {
        set(target, prop, val) {
          target[prop as any] = val
          trigger()
          return true
        },
      })
    },
    set(newValue: T[]) {
      value = newValue
      trigger()
    },
  }))
}

export type StepImg = {
  imageData: ImageData | null,
  label?: string,
  placeholderWidth?: number,
  placeholderHeight?: number,
  validationErrors?: StepValidationError[]
}

export type ImageDataRef = ReturnType<typeof imageDataToUrlImage>

export function imageDataRef(initial: ImageData | null = null) {
  const image = shallowRef<ImageData | null>(initial)
  const version = shallowRef(0)

  const width = computed(() => image.value?.width ?? 0)
  const height = computed(() => image.value?.height ?? 0)

  function markDirty() {
    version.value++
    triggerRef(image)
  }

  // Instead of intercepting sets, provide a method
  function set(newValue: ImageData | null) {
    image.value = newValue
    version.value++
    triggerRef(image)
  }

  return {
    image,
    set,
    width,
    height,
    version,
    markDirty,
  }
}
