import hotkeys from 'hotkeys-js'
import { toolsMetaToKeyBindEntries, toolsMetaToModifierKeyBindEntries } from '../CanvasEditor/_core/tools-input.ts'
import type { KeyboardEventFilter } from './_lib-types.ts'
import { useCanvasEditToolStore } from './store/canvas-edit-tool-store.ts'
import type { VueHistory } from './util/history/history.ts'

export function bindInputKeys(history: VueHistory) {

  const toolStore = useCanvasEditToolStore()

  const keys = {
    ...toolsMetaToKeyBindEntries(toolStore),

    // undo
    'command+z, ctrl+z': history.undo,
    'command+shift+z, ctrl+shift+z': history.redo,
  }
  for (const [k, v] of Object.entries(keys)) {
    hotkeys(k, v)
  }

  const unbinds = toolsMetaToModifierKeyBindEntries().map(({ filter, up, down }) => {
    return bindModifierKeysUpDown(filter, {
      up: () => up(toolStore),
      down: () => down(toolStore),
    })
  })

  return () => {
    hotkeys.unbind()
    unbinds.forEach(u => u())
  }
}

export function bindModifierKeysUpDown(filter: KeyboardEventFilter, { up, down }: {
  up: () => void,
  down: () => void
}) {
  const handleEvent = (e: KeyboardEvent) => {
    if (!filter(e)) return
    if (e.type === 'keydown') down()
    if (e.type === 'keyup') up()
  }

  window.addEventListener('keydown', handleEvent)
  window.addEventListener('keyup', handleEvent)

  return () => {
    window.removeEventListener('keydown', handleEvent)
    window.removeEventListener('keyup', handleEvent)
  }
}
