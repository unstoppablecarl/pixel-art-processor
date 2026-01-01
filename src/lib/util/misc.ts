import tinycolor from 'tinycolor2'

const blue = makeBgColor('#CCEDFC')
const green = makeBgColor('#D1FCCC')
const orange = makeBgColor('#FCEECC')
const purple = makeBgColor('#DACCFC')

function darkModeColor(color: string) {
  const hsl = tinycolor(color).toHsl()
  hsl.l = 1 - hsl.l

  return tinycolor(hsl).toRgbString()
}

function makeBgColor(light: string) {
  const dark = darkModeColor(light)
  return `background: light-dark(${light}, ${dark});`
}

export function logStepEvent(nodeId: string, event: string, ...args: any[]) {
  console.log(`%c[${nodeId}] %c${event}`, `${blue}`, `${green}`, ...args)
}

export function logStepWatch(nodeId: string, ...args: any[]) {
  console.log(`%c[${nodeId}] %cWATCH`, `${blue}`, `${orange}`, ...args)
}

export function logStepDebug(nodeId: string, ...args: any[]) {
  console.log(`%c[${nodeId}] %DEBUG`, `${blue}`, `${purple}`, ...args)
}

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
  const keys1 = Object.keys(obj1)
  const keys2 = Object.keys(obj2)

  if (keys1.length !== keys2.length) return false

  for (const key of keys1) {
    if (!keys2.includes(key) || !objectsAreEqual(obj1[key], obj2[key], maxDepth, currentDepth + 1)) {
      return false
    }
  }

  return true
}

export function arrayRemove<T>(array: T[], value: T): void {
  const index = array.indexOf(value)
  if (index === -1) return
  array.splice(index, 1)
}

export function normalizeValueToArray<T>(value: null | T | T[]): T[] {
  if (value === null) return []
  if (Array.isArray(value)) return value
  return [value]
}

export function analyzeArrayChange(
  oldArray: string[],
  newArray: string[],
): {
  movedStepId: string
  oldIndex: number
  newIndex: number
  isTransfer: boolean
} {
  // Find the step that moved
  let movedStepId: string | null = null
  let newIndex = -1

  // Check for new item (transfer in)
  for (let i = 0; i < newArray.length; i++) {
    if (!oldArray.includes(newArray[i])) {
      movedStepId = newArray[i]
      newIndex = i
      return {
        movedStepId,
        oldIndex: -1,
        newIndex,
        isTransfer: true,
      }
    }
  }

  // Check for removed item
  for (let i = 0; i < oldArray.length; i++) {
    if (!newArray.includes(oldArray[i])) {
      // Item was removed - it moved elsewhere
      return {
        movedStepId: oldArray[i],
        oldIndex: i,
        newIndex: -1,
        isTransfer: true,
      }
    }
  }

  // Find reordered item (same items, different positions)
  for (let i = 0; i < newArray.length; i++) {
    if (oldArray[i] !== newArray[i]) {
      movedStepId = newArray[i]
      newIndex = i
      const oldIndex = oldArray.indexOf(movedStepId)
      return {
        movedStepId,
        oldIndex,
        newIndex,
        isTransfer: false,
      }
    }
  }

  throw new Error('no array change found')
}

export type ImgSize = { width: number, height: number }