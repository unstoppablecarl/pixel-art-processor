import hotkeys from 'hotkeys-js'
import { BrushSubTool, SelectSubTool, Tool } from '../components/CanvasEditor/_core/_core-editor-types.ts'
import { useCanvasEditToolStore } from './store/canvas-edit-tool-store.ts'
import type { VueHistory } from './util/history/history.ts'

export const COPY_KEYS = 'command+c, ctrl+c'
export const PASTE_KEYS = 'command+v, ctrl+v'
export function bindInputKeys(history: VueHistory) {

  const toolStore = useCanvasEditToolStore()

  const keys = {
    // tools
    '[': () => toolStore.decreaseBrushSize(),
    ']': () => toolStore.increaseBrushSize(),
    'b': () => toolStore.setTool(Tool.BRUSH, BrushSubTool.ADD),
    'e': () => toolStore.setTool(Tool.BRUSH, BrushSubTool.REMOVE),
    'm': () => toolStore.setTool(Tool.SELECT, SelectSubTool.RECT),
    'w': () => toolStore.setTool(Tool.SELECT, SelectSubTool.FLOOD),

    // undo
    'command+z, ctrl+z': history.undo,
    'command+shift+z, ctrl+shift+z': history.redo,
  }
  for (const [k, v] of Object.entries(keys)) {
    hotkeys(k, v)
  }

  return () => {
    hotkeys.unbind()
  }
}