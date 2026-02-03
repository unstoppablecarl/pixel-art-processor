import type {
  LocalToolContext,
  ToolInputBindings,
} from '../../../components/CanvasEditor/TileGridEdit/_tile-grid-editor-types.ts'
import { tinykeys } from './tinykey.ts'

export type InputBindings = Record<string, (event: KeyboardEvent) => void>

export function makeCopyPasteKeys<T>(
  copy: (local: LocalToolContext<T>) => void,
  paste: (local: LocalToolContext<T>) => void,
): ToolInputBindings<T> {
  return {
    'Control+c': (local, e) => {
      e.preventDefault()
      copy(local)
    },
    'Meta+c': (local, e) => {
      e.preventDefault()
      copy(local)
    },
    'Control+v': (local, e) => {
      e.preventDefault()
      paste(local)
    },
    'Meta+v': (local, e) => {
      e.preventDefault()
      paste(local)
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