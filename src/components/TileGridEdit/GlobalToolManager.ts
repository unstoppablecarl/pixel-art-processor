import { watchEffect } from 'vue'
import { type CanvasPaintToolStore, useCanvasPaintToolStore } from '../../lib/store/canvas-paint-tool-store.ts'
import { bindInputKey, type InputBindings } from '../../lib/util/html-dom/keyboard.ts'
import { BlendMode, Tool } from '../CanvasPaint/_canvas-paint-types.ts'
import { type LocalToolContext } from './_tile-grid-editor-types.ts'
import { BrushShape, type BrushToolHandler, makeBrushTool } from './tools/brush.ts'
import { makeSelectTool, type SelectToolHandler } from './tools/select.ts'

export type GlobalToolContext = ReturnType<typeof makeGlobalToolContext>

export function makeGlobalToolContext(store: CanvasPaintToolStore) {
  return {
    get brushSize() {
      return store.brushSize
    },
    get brushShape() {
      return store.brushShape
    },
    get brushMode() {
      return store.brushMode
    },
    get brushColor() {
      return store.brushColor
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
    GLOBAL_TOOL_MANAGER = makeGlobalToolManager(useCanvasPaintToolStore())
  }
  return GLOBAL_TOOL_MANAGER
}

const noop = () => {
}
export type GlobalToolManager = ReturnType<typeof makeGlobalToolManager>

export function makeGlobalToolManager(store: CanvasPaintToolStore) {
  let removeKeys = noop
  const toolContext = makeGlobalToolContext(store)
  let currentTool: Tool = store.currentTool
  let activeLocal: LocalToolContext<any> | null = null

  const tools = {
    [Tool.BRUSH]: makeBrushTool(toolContext) as BrushToolHandler,
    [Tool.SELECT]: makeSelectTool(toolContext) as SelectToolHandler,
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
    setActiveLocal: (local: LocalToolContext<any>) => {
      activeLocal = local
    },
    get activeLocal() {
      return activeLocal
    },
  }
}