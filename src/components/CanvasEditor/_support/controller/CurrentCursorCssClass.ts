import { Tool, type ToolHandlersRecord } from '../../_core-editor-types.ts'
import type { Toolset } from '../../Toolset.ts'

export function makeGetCurrentCursorCssClass<
  B,
  S extends Record<Tool, any>,
  H extends ToolHandlersRecord<B, S>
>(
  toolset: Toolset<B, S, H>,
) {
  return function getCurrentCursorClass(): string | null {
    const tool = toolset.tools[toolset.currentTool]
    const local = toolset.localToolContexts[toolset.currentTool]

    if (typeof tool.cursorCssClass === 'function') {
      return tool.cursorCssClass(local) ?? null
    }

    return tool.cursorCssClass ?? null
  }
}