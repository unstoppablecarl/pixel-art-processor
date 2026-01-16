import {
  customRef,
  isProxy,
  isReactive,
  isReadonly,
  isRef,
  readonly,
  ref,
  type Ref,
  type ShallowRef,
  shallowRef,
  toRaw,
  toValue,
  type UnwrapNestedRefs,
  type UnwrapRef,
} from 'vue'
import { StepValidationError } from '../pipeline/errors/StepValidationError.ts'

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
export type ImageDataRef = {
  image: ShallowRef<ImageData | null>,
  set: (newValue: ImageData | null) => void,
  setQuiet: (newValue: ImageData | null) => void,
  width: Readonly<Ref<number>>,
  height: Readonly<Ref<number>>,
  watchTarget: Readonly<Ref<number>>,
  triggerRef: () => void,
  clear: () => void,
}

export function imageDataRef(initial: ImageData | null = null): ImageDataRef {
  const image = shallowRef<ImageData | null>(initial)
  const _width = ref(initial?.width ?? 0)
  const _height = ref(initial?.height ?? 0)
  const _watchTarget = ref(0)

  function setQuiet(newValue: ImageData | null) {
    if (!newValue) {
      image.value = null
      _width.value = 0
      _height.value = 0
      return
    }

    // Update dimensions immediately
    _width.value = newValue.width
    _height.value = newValue.height

    if (image.value &&
      image.value.width === newValue.width &&
      image.value.height === newValue.height) {
      image.value.data.set(newValue.data)
    } else {
      image.value = newValue
    }
  }

  function clear() {
    set(null)
  }

  function set(newValue: ImageData | null) {
    setQuiet(newValue)
    _watchTarget.value++
  }

  function triggerRef() {
    _watchTarget.value++
  }

  return {
    image,
    set,
    clear,
    setQuiet,
    triggerRef,
    watchTarget: readonly(_watchTarget),
    width: readonly(_width),
    height: readonly(_height),
  }
}