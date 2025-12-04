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

export function logStepEvent(stepId: string, event: string, ...args: any[]) {
  console.log(`%c[${stepId}] %c${event}`, `${blue}`, `${green}`, ...args)
}

export function logStepWatch(stepId: string, ...args: any[]) {
  console.log(`%c[${stepId}] %cWATCH`, `${blue}`, `${orange}`, ...args)
}

export function logStepDebug(stepId: string, ...args: any[]) {
  console.log(`%c[${stepId}] %DEBUG`, `${blue}`, `${purple}`, ...args)
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