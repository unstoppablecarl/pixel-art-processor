import { watchEffect } from 'vue'
import { type CanvasEditToolStore, type GlobalToolContext } from '../../lib/store/canvas-edit-tool-store.ts'
import { type BaseToolHandler, Tool, type ToolRegistry } from './_core-editor-types.ts'

export type Toolset<
  TTools extends ToolRegistry<BaseToolHandler<any, any>>
> = {
  tools: TTools
  toolContext: GlobalToolContext
  readonly currentTool: Tool
  readonly currentToolHandler: TTools[Tool]
  setTool: (tool: Tool) => void
  setActiveLocal: (local: any) => void
  readonly activeLocal: any
}

export function makeToolset<
  TTools extends ToolRegistry<BaseToolHandler<any, any>>
>(
  store: CanvasEditToolStore,
  tools: TTools,
  toolContext: GlobalToolContext,
): Toolset<TTools> {
  let currentTool: Tool = store.currentTool
  let activeLocal: any = null

  function setTool(tool: Tool) {
    if (activeLocal) {
      tools[currentTool]?.onDeselect?.(activeLocal)
    }
    currentTool = tool
    if (activeLocal) {
      tools[currentTool]?.onSelect?.(activeLocal)
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
    setActiveLocal: (local: any) => {
      activeLocal = local
    },
    get activeLocal() {
      return activeLocal
    },
  }
}

export function makeLocalToolContexts<B, S extends ToolRegistry<any>>(baseLocalToolContext: B, localToolStates: S) {
  return Object.fromEntries(
    Object.entries(localToolStates).map(([key, val]) => {
      return [key as Tool, { ...baseLocalToolContext, toolState: localToolStates[key as Tool] }]
    }),
  )
}