import { watch } from 'vue'
import { type CanvasEditToolStore } from '../../../lib/store/canvas-edit-tool-store.ts'
import { Tool, type ToolHandlersRecord } from './_core-editor-types.ts'

export interface Toolset<
  H extends ToolHandlersRecord<any>
> {
  readonly toolHandlers: H
  readonly currentTool: Tool
  readonly currentToolHandler: H[Tool]
  readonly setTool: (tool: Tool) => void
}

export function makeToolset<
  H extends ToolHandlersRecord<any>
>(
  store: CanvasEditToolStore,
  toolHandlers: H,
): Toolset<H> {

  watch(() => store.currentTool, (newTool, oldTool) => {
    if (oldTool) {
      toolHandlers[oldTool]?.onDeselect?.()
    }
    if (newTool) {
      toolHandlers[newTool]?.onSelect?.()
    }
  }, { immediate: true })

  return {
    toolHandlers,
    get currentTool() {
      return store.currentTool
    },
    get currentToolHandler() {
      return toolHandlers[store.currentTool]
    },
    setTool: (tool: Tool) => {
      store.currentTool = tool
    },
  }
}