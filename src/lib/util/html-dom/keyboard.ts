import { tinykeys } from './tinykey.ts'

export type InputBindings = Record<string, (event: KeyboardEvent) => void>

export function makeCopyPasteKeys(copy: () => void, paste: () => void): InputBindings {
  return {
    'Control+c': (e) => {
      e.preventDefault()
      copy()
    },
    'Meta+c': (e) => {
      e.preventDefault()
      copy()
    },
    'Control+v': (e) => {
      e.preventDefault()
      paste()
    },
    'Meta+v': (e) => {
      e.preventDefault()
      paste()
    },
  }
}

export function bindInputKey(bindings: InputBindings, target: Window | HTMLElement = window) {
  const unsubscribe = tinykeys(target, bindings)
  let removed = false
  return () => {
    if (removed) return
    unsubscribe()
    removed = true
  }
}