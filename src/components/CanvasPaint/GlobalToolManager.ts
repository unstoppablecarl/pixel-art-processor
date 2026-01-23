import { watchEffect } from 'vue'
import { type CanvasPaintStore, useCanvasPaintStore } from '../../lib/store/canvas-paint-store.ts'
import { bindInputKey, type InputBindings } from '../../lib/util/html-dom/keyboard.ts'
import { type LocalTool, Tool, type ToolHandler } from './_canvas-editor-types.ts'
import type { LocalToolManager } from './LocalToolManager.ts'
import { BrushShape, makeBrushTool } from './tools/brush.ts'
import { makeSelectTool, SelectMoveBlendMode } from './tools/select.ts'

export type GlobalToolContext = ReturnType<typeof makeGlobalToolContext>

export function makeGlobalToolContext(store: CanvasPaintStore) {
  return {
    get brushSize() {
      return store.brushSize
    },
    get brushShape() {
      return store.brushShape
    },
    get selectMoveBlendMode() {
      return store.selectMoveBlendMode
    },
    decreaseBrushSize() {
      store.brushSize--
      console.log('store.brushSize', store.brushSize)
    },
    increaseBrushSize() {
      store.brushSize++
      console.log('store.brushSize', store.brushSize)
    },
    setBrushSize(n: number) {
      store.brushSize = n
    },
    setBrushShape(s: BrushShape) {
      store.brushShape = s
    },
    setSelectMoveBlendMode(m: SelectMoveBlendMode) {
      store.selectMoveBlendMode = m
    },
  }
}

let GLOBAL_TOOL_MANAGER: GlobalToolManager | undefined

export function useGlobalToolManager() {
  if (!GLOBAL_TOOL_MANAGER) {
    GLOBAL_TOOL_MANAGER = makeGlobalToolManager(useCanvasPaintStore())
  }
  return GLOBAL_TOOL_MANAGER
}

const noop = () => {
}
export type GlobalToolManager = ReturnType<typeof makeGlobalToolManager>

export function makeGlobalToolManager(store: CanvasPaintStore) {
  let removeKeys = noop
  const toolContext = makeGlobalToolContext(store)
  let currentTool: Tool
  let activeLocal: LocalTool | null = null

  const localManagers = new Set<LocalToolManager>()

  const toolFactories: Record<Tool, () => ToolHandler> = {
    [Tool.BRUSH]: () => makeBrushTool(toolContext),
    [Tool.SELECT]: () => makeSelectTool(toolContext),
  }

  function setTool(tool: Tool) {
    if (currentTool && activeLocal) {
      toolFactories[currentTool]?.onDeselect?.(activeLocal)
    }
    removeKeys()

    for (const l of localManagers) {
      l.onGlobalToolChanging?.(currentTool, tool)
    }

    currentTool = tool
    if (activeLocal) {
      toolFactories[currentTool]?.onSelect?.(activeLocal)
    }
    removeKeys = installKeybindings()
  }

  function installKeybindings() {
    const bindings = toolFactories[currentTool]?.inputBindings
    if (!bindings) return noop

    const wrapped: InputBindings = {}
    for (const key in bindings) {
      wrapped[key] = (e) => bindings[key](activeLocal!, e)
    }

    return bindInputKey(wrapped)
  }

  watchEffect(() => setTool(store.currentTool))

  return {
    toolFactories,
    toolContext,
    get currentTool() {
      return currentTool
    },
    setTool,
    setActiveLocal: (local: LocalTool) => {
      activeLocal = local
    },
    get activeLocal() {
      return activeLocal
    },
  }
}
