import { watchEffect } from 'vue'
import { type CanvasPaintStore, useCanvasPaintStore } from '../../lib/store/canvas-paint-store.ts'
import { bindInputKey, type InputBindings } from '../../lib/util/html-dom/keyboard.ts'
import { type LocalToolContext, BlendMode, Tool, type ToolHandler } from './_canvas-editor-types.ts'
import { BrushShape, makeBrushTool } from './tools/brush.ts'
import { makeSelectTool } from './tools/select.ts'

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
    },
    increaseBrushSize() {
      store.brushSize++
    },
    setBrushSize(n: number) {
      store.brushSize = n
    },
    setBrushShape(s: BrushShape) {
      store.brushShape = s
    },
    setSelectMoveBlendMode(m: BlendMode) {
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
  let currentTool: Tool = store.currentTool
  let activeLocal: LocalToolContext | null = null

  const tools: Record<Tool, ToolHandler> = {
    [Tool.BRUSH]: makeBrushTool(toolContext),
    [Tool.SELECT]: makeSelectTool(toolContext),
  }

  function setTool(tool: Tool) {
    if (activeLocal) {
      tools[currentTool]?.onDeselect?.(activeLocal)
    }
    removeKeys()

    currentTool = tool
    if (activeLocal) {
      tools[currentTool]?.onSelect?.(activeLocal)
    }
    removeKeys = installKeybindings()
  }

  function installKeybindings() {
    const bindings = tools[currentTool]?.inputBindings
    if (!bindings) return noop

    const wrapped: InputBindings = {}
    for (const key in bindings) {
      wrapped[key] = (e) => bindings[key](activeLocal!, e)
    }

    return bindInputKey(wrapped)
  }

  watchEffect(() => setTool(store.currentTool))

  return {
    tools,
    toolContext,
    get currentTool() {
      return currentTool
    },
    get currentToolHandler() {
      return tools[currentTool]
    },
    setTool,
    setActiveLocal: (local: LocalToolContext) => {
      activeLocal = local
    },
    get activeLocal() {
      return activeLocal
    },
  }
}