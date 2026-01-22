import { watchEffect } from 'vue'
import { type CanvasPaintStore, useCanvasPaintStore } from '../../lib/store/canvas-paint-store.ts'
import { bindInputKey } from '../../lib/util/html-dom/keyboard.ts'
import { type LocalTool, Tool, type ToolHandler } from './_canvas-editor-types.ts'
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

export type GlobalToolManager = ReturnType<typeof makeGlobalToolManager>

export function makeGlobalToolManager(store: CanvasPaintStore) {
  let removeKeys = () => {}
  const toolContext = makeGlobalToolContext(store)
  let currentTool: Tool

  // he local tool manager instance that last interacted with the tool.
  let activeLocal: LocalTool | null = null

  function setActiveLocal(local: LocalTool) {
    activeLocal = local
  }

  const tools: Record<Tool, ToolHandler> = {
    [Tool.BRUSH]: makeBrushTool(toolContext),
    [Tool.SELECT]: makeSelectTool(toolContext),
  }

  function setTool(tool: Tool) {
    // unselect old tool
    if (currentTool && activeLocal) {
      tools[currentTool]?.onUnSelectTool?.(activeLocal)
    }

    // remove old shortcuts
    removeKeys()

    currentTool = tool

    // select new tool
    if (activeLocal) {
      tools[currentTool]?.onSelectTool?.(activeLocal)
    }

    // install new shortcuts
    const bindings = tools[currentTool]?.inputBindings
    if (bindings) {
      removeKeys = bindInputKey(bindings)
    } else {
      removeKeys = () => {}
    }
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
    setActiveLocal,
    get activeLocal() { return activeLocal }
  }
}
