import type { Optional } from '../../lib/_helpers.ts'
import type { KeyboardEventFilter } from '../../lib/_lib-types.ts'
import type { CanvasEditToolStore } from '../../lib/store/canvas-edit-tool-store.ts'
import { BrushSubTool, SelectMoveMode, SelectSubTool, Tool } from './_core-editor-types.ts'

export type ToolMeta = {
  displayName: string,
  keyBindings: KeyBinding[],
  modifierKeyBindings: ModifierKeyBinding[],
  subTools: Record<string, SubToolMeta>,
}

export type SubToolMeta = {
  displayName: string,
  keyBinding?: Optional<KeyBinding, 'description'>
}

type ToolStoreFn = (store: CanvasEditToolStore) => void

export type KeyBinding = {
  key: string,
  description: string,
  fn: ToolStoreFn,
}

export type ModifierKeyBinding = {
  filter: KeyboardEventFilter,
  downKey: string,
  upDescription: string,
  downDescription: string,
  up: ToolStoreFn,
  down: ToolStoreFn,
  isDown: (store: CanvasEditToolStore) => boolean,
}

export type ToolsMeta = Record<Tool, ToolMeta>
export const TOOLS_META: ToolsMeta = {
  [Tool.BRUSH]: {
    displayName: 'Brush',
    keyBindings: [
      {
        key: '[',
        description: 'Decrease brush size',
        fn: (store: CanvasEditToolStore) => {
          if (store.currentTool === Tool.BRUSH) {
            store.decreaseBrushSize()
          }
        },
      },
      {
        key: ']',
        description: 'Increase brush size',
        fn: (store: CanvasEditToolStore) => {
          if (store.currentTool === Tool.BRUSH) {
            store.increaseBrushSize()
          }
        },
      },
    ],
    modifierKeyBindings: [
      {
        downDescription: 'Lock to cardinal directions',
        downKey: 'Shift',
        upDescription: '',
        filter: (e) => e.key === 'Shift',
        up: (store) => {
          if (store.currentTool === Tool.BRUSH) {
            store.brushLockCardinalDirections = false
          }
        },
        down: (store) => {
          if (store.currentTool === Tool.BRUSH) {
            store.brushLockCardinalDirections = true
          }
        },
        isDown: (store) => store.brushLockCardinalDirections,
      },
    ],
    subTools: {
      [BrushSubTool.ADD]: {
        displayName: 'Add',
        keyBinding: {
          key: 'b',
          fn: (store: CanvasEditToolStore) => store.setTool(Tool.BRUSH, BrushSubTool.ADD),
        },
      },
      [BrushSubTool.REMOVE]: {
        displayName: 'Remove',
        keyBinding: {
          key: 'e',
          description: 'Brush Remove',
          fn: (store: CanvasEditToolStore) => store.setTool(Tool.BRUSH, BrushSubTool.REMOVE),
        },
      },
    },
  },
  [Tool.SELECT]: {
    displayName: 'Select',
    keyBindings: [],
    modifierKeyBindings: [
      {
        downDescription: 'Move Content',
        downKey: 'Ctrl/Meta',
        upDescription: 'Move Selection',
        filter: (e) => e.key === 'Meta' || e.key === 'Control',
        up: (store) => {
          if (store.currentTool === Tool.SELECT) {
            store.selectionMoveMode = SelectMoveMode.SELECTION
          }
        },
        down: (store) => {
          if (store.currentTool === Tool.SELECT) {
            store.selectionMoveMode = SelectMoveMode.CONTENT
          }
        },
        isDown: (store) => store.selectionMoveMode === SelectMoveMode.CONTENT,
      },
    ],
    subTools: {
      [SelectSubTool.RECT]: {
        displayName: 'Rect',
        keyBinding: {
          key: 'm',
          fn: (store: CanvasEditToolStore) => store.setTool(Tool.SELECT, SelectSubTool.RECT),
        },
      },
      [SelectSubTool.FLOOD]: {
        displayName: 'Flood',
        keyBinding: {
          key: 'w',
          fn: (store: CanvasEditToolStore) => store.setTool(Tool.SELECT, SelectSubTool.FLOOD),
        },
      },
    },
  },
}

export function toolsMetaToKeyBindEntries(store: CanvasEditToolStore) {

  let out: Record<string, () => void> = {}

  Object.values(TOOLS_META).forEach((toolMeta) => {
    out = {
      ...out,
      ...Object.fromEntries(toolMeta.keyBindings.map(item => [item.key, () => item.fn(store)])),
    }

    Object.values(toolMeta.subTools).forEach((subToolMeta) => {
      const binding = subToolMeta.keyBinding
      if (!binding) return

      out[binding.key] = () => binding.fn(store)
    })
  })
  return out
}

export function toolsMetaToModifierKeyBindEntries() {
  const out: ModifierKeyBinding[] = []

  for (const tool of Object.values(TOOLS_META)) {
    const modifierKeyBindings = tool.modifierKeyBindings
    if (!modifierKeyBindings) continue
    out.push(...modifierKeyBindings)
  }

  return out
}
