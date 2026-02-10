import { BrushSubTool, SelectSubTool, Tool } from '../components/CanvasEditor/_core-editor-types.ts'
import { useCanvasEditToolStore } from './store/canvas-edit-tool-store.ts'
import type { VueHistory } from './util/history/history.ts'
import { bindInputKey } from './util/html-dom/keyboard.ts'

export function bindInputKeys(history: VueHistory) {

  const toolStore = useCanvasEditToolStore()

  const unSubs: (() => void)[] = [
    bindInputKey({
      '[': () => toolStore.decreaseBrushSize(),
      ']': () => toolStore.increaseBrushSize(),
      'b': () => toolStore.setTool(Tool.BRUSH, BrushSubTool.ADD),
      'e': () => toolStore.setTool(Tool.BRUSH, BrushSubTool.REMOVE),
      'm': () => toolStore.setTool(Tool.SELECT, SelectSubTool.RECT),
      'w': () => toolStore.setTool(Tool.SELECT, SelectSubTool.FLOOD),
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