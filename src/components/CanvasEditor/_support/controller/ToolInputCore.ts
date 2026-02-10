import { type BaseEditorState, Tool, type ToolHandlersRecord } from '../../_core-editor-types.ts'
import type { Toolset } from '../../Toolset.ts'

export function makeToolInputCore<
  B,
  S extends Record<Tool, any>,
  H extends ToolHandlersRecord<B, S>
>(
  state: BaseEditorState,
  toolset: Toolset<B, S, H>,
) {
  return {
    pointerDown(x: number, y: number, ...extra: any[]) {
      state.mouseDownX = x
      state.mouseDownY = y
      state.mouseLastX = x
      state.mouseLastY = y
      state.mouseDragStartX = null
      state.mouseDragStartY = null
      state.isDragging = false

      const local = toolset.currentLocalContext

      toolset.currentToolHandler?.onMouseDown?.(
        local,
        x,
        y,
        ...extra,
      )
    },
    pointerMove(x: number, y: number, ...extra: any[]) {
      const local = toolset.currentLocalContext

      if (state.mouseDownX !== null && state.mouseDownY !== null) {
        const dx = x - state.mouseDownX
        const dy = y - state.mouseDownY

        if (!state.isDragging &&
          (Math.abs(dx) > state.dragThreshold || Math.abs(dy) > state.dragThreshold)) {

          state.isDragging = true
          state.mouseDragStartX = state.mouseDownX
          state.mouseDragStartY = state.mouseDownY

          toolset.currentToolHandler?.onDragStart?.(
            local,
            state.mouseDownX,
            state.mouseDownY,
            ...extra,
          )
        } else {
          toolset.currentToolHandler?.onDragMove?.(
            local,
            x,
            y,
            ...extra,
          )
        }
      } else {
        toolset.currentToolHandler?.onMouseMove?.(
          local,
          x,
          y,
          ...extra,
        )
      }

      state.mouseLastX = x
      state.mouseLastY = y
    },
    pointerUp(x: number, y: number, ...extra: any[]) {
      const local = toolset.currentLocalContext

      if (state.isDragging) {
        toolset.currentToolHandler?.onDragEnd?.(
          local,
          x,
          y,
          ...extra,
        )
      } else {
        toolset.currentToolHandler?.onClick?.(
          local,
          x,
          y,
          ...extra,
        )
      }

      state.mouseDownX = null
      state.mouseDownY = null
      state.isDragging = false
      state.mouseDragStartX = null
      state.mouseDragStartY = null
    },
    pointerLeave(...extra: any[]) {
      if (state.isDragging) return

      const local = toolset.currentLocalContext
      toolset.tools[toolset.currentTool]?.onMouseLeave?.(
        local,
        ...extra,
      )
    },
  }
}