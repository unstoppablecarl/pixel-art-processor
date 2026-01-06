import tinycolor from 'tinycolor2'
import type { NodeDataTypeColors } from '../../steps.ts'
import type { NodeDataTypeColor } from '../pipeline/_types.ts'
import { deepUnwrap } from './vue-util.ts'

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

let logActive = true

export function setLogActive(flag: boolean) {
  logActive = flag
}

function log(color: string, nodeId: string, event: string, ...args: any[]) {
  if (!logActive) return
  console.log(`%c[${nodeId}] %c${event}`, `${blue}`, `${color}`, ...args.map((m) => deepUnwrap(m)))
}

export function logNodeEvent(nodeId: string, event: string, ...args: any[]) {
  log(green, nodeId, event, ...args)
}

export function logNodeEventWarning(nodeId: string, event: string, ...args: any[]) {
  log(orange, nodeId, event, ...args)
}

export function logNodeWatch(nodeId: string, name: string, ...args: any[]) {
  if (!logActive) return
  console.log(`%c[${nodeId}] %cWATCH %c${name}`, `${blue}`, `${orange}`, `${purple}`, ...args.map((m) => deepUnwrap(m)))
}

export function logNodeDebug(nodeId: string, ...args: any[]) {
  log(purple, nodeId, 'DEBUG', ...args)
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

export function normalizeValueToArray<T>(value: null | T | T[]): T[] {
  if (value === null) return []
  if (Array.isArray(value)) return value
  return [value]
}

export type ImgSize = { width: number, height: number }

export function injectCss(cssString: string) {
  const head = document.head || document.getElementsByTagName('head')[0]
  const style = document.createElement('style')
  style.appendChild(document.createTextNode(cssString))
  head.appendChild(style)
}

export function buildNodeDataTypeCss(items: NodeDataTypeColor[]) {
  return items.map(({ cssClass, key }) => {
    return `.${cssClass} { background: var(${key}) !important; }`
  }).join(' ')
}

export function injectNodeDataTypeCss(stepDataTypeColors: NodeDataTypeColors) {
  const items = [...stepDataTypeColors.values()]
  for (const { key, color } of items) {
    document.documentElement.style.setProperty(key, color)
  }
  injectCss(buildNodeDataTypeCss(items))
}

export function arrayRemove(array: any[], item: any): void {
  const index = array.indexOf(item)
  if (index !== -1) {
    array.toSpliced(index, 1)
  }
}