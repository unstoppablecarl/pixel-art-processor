import type { BaseToolHandler, Tool, ToolRegistry } from '../../_core-editor-types.ts'
import type { Toolset } from '../../Toolset.ts'

export function makeGetCurrentCursorCssClass<
  TTools extends ToolRegistry<BaseToolHandler<any, any>>,
  TLocalToolContexts extends Record<Tool, any>,
  TToolset extends Toolset<TTools>
>(
  toolset: TToolset,
  localToolContexts: TLocalToolContexts,
) {
  return function getCurrentCursorClass(): string | null {
    const tool = toolset.tools[toolset.currentTool]
    const local = localToolContexts[toolset.currentTool]

    if (typeof tool.cursorCssClass === 'function') {
      return tool.cursorCssClass(local) ?? null
    }

    return tool.cursorCssClass ?? null
  }
}