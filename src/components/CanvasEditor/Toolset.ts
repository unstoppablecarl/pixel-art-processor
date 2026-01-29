import { watchEffect } from 'vue'
import { type CanvasPaintToolStore, useGlobalToolContext } from '../../lib/store/canvas-paint-tool-store.ts'
import { bindInputKey, type InputBindings } from '../../lib/util/html-dom/keyboard.ts'
import type { LocalToolContext, ToolHandler } from './TileGridEdit/_tile-grid-editor-types.ts'
import { Tool, type ToolRegistry } from './_canvas-editor-types.ts'

const noop = () => {
}
export type Toolset = ReturnType<typeof makeToolset>

type ToolHandlers = ToolRegistry<ToolHandler<any>>

export function makeToolset<T extends ToolHandlers>(store: CanvasPaintToolStore, tools: T) {
  let removeKeys = noop
  const toolContext = useGlobalToolContext(store)
  let currentTool: Tool = store.currentTool
  let activeLocal: LocalToolContext<any> | null = null

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