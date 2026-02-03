import { useCanvasEditToolStore } from './store/canvas-edit-tool-store.ts'
import { bindInputKey } from './util/html-dom/keyboard.ts'

bindInputKey({
  '[': () => useCanvasEditToolStore().decreaseBrushSize(),
  ']': () => useCanvasEditToolStore().increaseBrushSize(),
})