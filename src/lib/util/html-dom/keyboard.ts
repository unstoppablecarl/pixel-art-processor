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

function makeKeyListener() {
  const pressedKeys = new Set()
  window.addEventListener('keydown', (event) => {
    if (pressedKeys.has(event.key)) return
    pressedKeys.add(event.key)
  })

  window.addEventListener('keyup', (event) => {
    pressedKeys.delete(event.key)
  })

  window.addEventListener('blur', () => {
    pressedKeys.clear()
  })

  return {
    isDown: (keyCode: string) => pressedKeys.has(keyCode),
    controlIsDown: () => pressedKeys.has('Control'),
    shiftIsDown: () => pressedKeys.has('Shift'),
    altIsDown: () => pressedKeys.has('Alt'),
    metaIsDown: () => pressedKeys.has('Meta'),
  }
}

export const KEY_INPUT = makeKeyListener()

