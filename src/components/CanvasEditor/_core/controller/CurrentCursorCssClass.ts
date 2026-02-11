import { type ToolHandlersRecord } from '../_core-editor-types.ts'
import type { Toolset } from '../Toolset.ts'

export function makeGetCurrentCursorCssClass<
  H extends ToolHandlersRecord<any>
>(
  toolset: Toolset<H>,
) {
  return function getCurrentCursorClass(): string | null {
    const tool = toolset.currentToolHandler

    if (typeof tool.cursorCssClass === 'function') {
      return tool.cursorCssClass() ?? null
    }

    return tool.cursorCssClass ?? null
  }
}