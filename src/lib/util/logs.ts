import tinycolor from 'tinycolor2'
import { deepUnwrap } from './vue-util.ts'

let logActive = false
const unwrap = false

const parseArg = (m: any) => unwrap ? deepUnwrap(m) : m

export function setLogActive(flag: boolean) {
  logActive = flag
}

function log(color: string, nodeId: string, event: string, ...args: any[]) {
  if (!logActive) return
  console.log(`%c[${nodeId}] %c${event}`, `${blue}`, `${color}`, ...args.map(parseArg))
}

export function logNodeEvent(nodeId: string, event: string, ...args: any[]) {
  log(green, nodeId, event, ...args)
}

export function logNodeFunction<T>(nodeId: string, func: string, cb: () => T) {
  logNodeEvent(nodeId, `${func}: start`)
  const result = cb()
  logNodeEvent(nodeId, `${func}: end`, result)
  return result
}

export function logNodeEventWarning(nodeId: string, event: string, ...args: any[]) {
  log(orange, nodeId, event, ...args)
}

export function logNodeWatch(nodeId: string, name: string, ...args: any[]) {
  if (!logActive) return
  console.log(`%c[${nodeId}] %cWATCH %c${name}`, `${blue}`, `${orange}`, `${purple}`, ...args.map(parseArg))
}

export function logNodeDebug(nodeId: string, ...args: any[]) {
  log(purple, nodeId, 'DEBUG', ...args)
}

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
