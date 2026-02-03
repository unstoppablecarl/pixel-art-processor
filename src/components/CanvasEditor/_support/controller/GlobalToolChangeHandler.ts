import type { Tool } from '../../_core-editor-types.ts'

export function makeGlobalToolChangeHandler<
  Toolset extends {
    tools: Record<Tool, any>
  },
  LocalToolContexts extends Record<Tool, any>
>(
  toolset: Toolset,
  localToolContexts: LocalToolContexts
) {
  return function onGlobalToolChanging(newTool: Tool, prevTool: Tool | null) {
    if (!prevTool) return

    const local = localToolContexts[prevTool]
    toolset.tools[prevTool]?.onGlobalToolChanging?.(
      local,
      newTool,
      prevTool,
    )
  }
}
