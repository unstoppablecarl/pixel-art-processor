import { watch } from 'vue'
import { type CanvasEditToolStore } from '../../lib/store/canvas-edit-tool-store'
import { Tool, type ToolHandlersRecord } from './_core-editor-types'

export interface Toolset<
  B,
  S extends Record<Tool, any>,
  H extends ToolHandlersRecord<B, S>
> {
  readonly tools: H
  readonly localToolContexts: { [K in Tool]: B & { toolState: S[K] } }
  readonly currentTool: Tool
  readonly currentToolHandler: H[Tool]
  readonly currentLocalContext: B & { toolState: S[Tool] }
  readonly setTool: (tool: Tool) => void
  readonly localToolStates: S
}

export function makeToolset<
  TBase extends Record<string, any>,
  TStates extends Record<Tool, any>,
  THandlers extends ToolHandlersRecord<TBase, TStates>
>(
  store: CanvasEditToolStore,
  toolHandlers: THandlers,
  toolStates: TStates,
  baseLocalContext: TBase,
): Toolset<TBase, TStates, THandlers> {

  const contexts = Object.fromEntries(
    Object.values(Tool).map((tool) => [
      tool,
      { ...baseLocalContext, toolState: toolStates[tool] },
    ]),
  ) as { [K in Tool]: TBase & { toolState: TStates[K] } }

  watch(() => store.currentTool, (newTool, oldTool) => {
    if (oldTool) {
      toolHandlers[oldTool]?.onDeselect?.(contexts[oldTool])
    }
    if (newTool) {
      toolHandlers[newTool]?.onSelect?.(contexts[newTool])
    }
  }, { immediate: true })

  return {
    tools: toolHandlers,
    localToolContexts: contexts,
    localToolStates: toolStates,
    get currentTool() {
      return store.currentTool
    },
    get currentToolHandler() {
      return toolHandlers[store.currentTool]
    },
    get currentLocalContext() {
      return contexts[store.currentTool]
    },
    setTool: (tool: Tool) => {
      store.currentTool = tool
    },
  }
}