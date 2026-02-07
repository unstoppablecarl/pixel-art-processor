import { useCanvasEditToolStore } from './store/canvas-edit-tool-store.ts'
import type { VueHistory } from './util/history/history.ts'
import { bindInputKey } from './util/html-dom/keyboard.ts'

export function bindInputKeys(history: VueHistory) {
  const unSubs: (() => void)[] = [
    bindInputKey({
      '[': () => useCanvasEditToolStore().decreaseBrushSize(),
      ']': () => useCanvasEditToolStore().increaseBrushSize(),
    }),
    bindInputKey({
      'Meta+z': history.undo,
      'Meta+Shift+z': history.redo,
      'Control+z': history.undo,
      'Control+Shift+z': history.redo,
    }),
  ]

  return () => {
    for (const unsub of unSubs) {
      unsub()
    }
  }
}