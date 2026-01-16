export function objectsAreEqual(obj1: any, obj2: any, maxDepth = 400, currentDepth = 0) {
  if (obj1 === obj2) return true // Strict equality for primitives or same object reference

  // Handle null or non-object types
  if (obj1 === null || typeof obj1 !== 'object' ||
    obj2 === null || typeof obj2 !== 'object') {
    return obj1 === obj2
  }

  // Stop recursion if max depth is reached. Compare as primitives at this point.
  if (currentDepth >= maxDepth) {
    return obj1 === obj2
  }

  // Handle Arrays
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) return false
    for (let i = 0; i < obj1.length; i++) {
      if (!objectsAreEqual(obj1[i], obj2[i], maxDepth, currentDepth + 1)) return false
    }
    return true
  }

  // Handle Objects
  const keys1 = Object.keys(obj1).filter(k => obj1[k] !== undefined)
  const keys2 = Object.keys(obj2).filter(k => obj1[k] !== undefined)

  if (keys1.length !== keys2.length) return false

  for (const key of keys1) {
    if (!keys2.includes(key) || !objectsAreEqual(obj1[key], obj2[key], maxDepth, currentDepth + 1)) {
      return false
    }
  }

  return true
}

export function normalizeValueToArray<T>(value: null | T | T[]): T[] {
  if (value === null) return []
  if (Array.isArray(value)) return value
  return [value]
}

export function arrayRemove(array: any[], item: any): void {
  const index = array.indexOf(item)
  if (index !== -1) {
    array.toSpliced(index, 1)
  }
}

export function readonlyTypedArray(arr: any, error = 'Cannot modify readonly TypedArray') {
  return new Proxy(arr, {
    get: (target, prop) => Reflect.get(target, prop),
    set() {
      if (__DEV__) {
        throw new Error(error)
      }
      return false
    },
    defineProperty: () => false,
    deleteProperty: () => false,
    setPrototypeOf: () => false,
  })
}

export const debounce = <T extends (...args: any[]) => any>(
  callback: T,
  waitFor: number,
) => {
  let timeout: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>): ReturnType<T> => {
    let result: any
    timeout && clearTimeout(timeout)
    timeout = setTimeout(() => {
      result = callback(...args)
    }, waitFor)
    return result
  }
}

export function throttle<T extends (...args: any[]) => void>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout | null = null
  let lastArgs: any[] | null = null

  return function(this: any, ...args: any[]) {
    lastArgs = args
    const context = this

    if (!timeout) {
      timeout = setTimeout(() => {
        if (lastArgs) {
          func.apply(context, lastArgs)
          lastArgs = null
        }
        timeout = null
      }, wait)
    }
  } as T
}
