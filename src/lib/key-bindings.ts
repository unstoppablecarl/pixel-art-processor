import { useGlobalToolContext } from './store/canvas-edit-tool-store.ts'
import { bindInputKey } from './util/html-dom/keyboard.ts'

bindInputKey({
  '[': () => useGlobalToolContext().decreaseBrushSize(),
  ']': () => useGlobalToolContext().increaseBrushSize(),
})