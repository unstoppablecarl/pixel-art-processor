import { tinykeys } from './tinykey.ts'

export type InputBindings = Record<string, (event: KeyboardEvent) => void>

export function bindInputKey(bindings: InputBindings, target: Window | HTMLElement = window) {
  const unsubscribe = tinykeys(target, bindings)
  let removed = false
  return () => {
    if (removed) return
    unsubscribe()
    removed = true
  }
}

export function makeKeyDownListener() {
  const pressedKeys = new Set()
  const onKeyDown = (e: KeyboardEvent) => {
    if (pressedKeys.has(e.key)) return
    pressedKeys.add(e.key)
  }
  const onKeyUp = (e: KeyboardEvent) => pressedKeys.delete(e.key)
  const onBlur = () => pressedKeys.clear()

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onBlur)

  return {
    control: () => pressedKeys.has('Control'),
    shift: () => pressedKeys.has('Shift'),
    alt: () => pressedKeys.has('Alt'),
    meta: () => pressedKeys.has('Meta'),
  }
}

export const KEY_DOWN = makeKeyDownListener()
