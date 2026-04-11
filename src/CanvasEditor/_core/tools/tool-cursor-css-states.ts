import type { Ref } from 'vue'
import { type BaseUIContext, SelectCursorState, Tool, ToolCursorStateMap } from '../_core-editor-types.ts'

const SELECT_MAP: Record<SelectCursorState, string> = {
  [SelectCursorState.NONE]: '',
  [SelectCursorState.OVER_SELECTION]: 'over-selection',
}

const TOOL_CURSOR_CLASS: {
  [T in Tool]: null | ((state: ToolCursorStateMap[T]) => string)
} = {
  [Tool.SELECT]: (state: SelectCursorState) => SELECT_MAP[state],
  [Tool.BRUSH]: null,
}

export function makeUIContext<T extends Tool>(tool: T, currentCursorCssClass: Ref<string | null>): BaseUIContext<T> {
  return {
    setCursorState: (state: ToolCursorStateMap[T]) => {
      const handler = TOOL_CURSOR_CLASS[tool]
      if (!handler) return
      currentCursorCssClass.value = handler(state)
    },
  }
}