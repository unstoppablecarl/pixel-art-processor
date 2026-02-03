// makeToolInputCore.ts
import type { Tool } from '../../_core-editor-types.ts'

type ToolMap = Record<Tool, any>
type LocalToolContexts = Record<Tool, any>

export function makeToolInputCore<
  TState extends {
    dragThreshold: number
    mouseDownX: number | null
    mouseDownY: number | null
    mouseLastX: number | null
    mouseLastY: number | null
    mouseDragStartX: number | null
    mouseDragStartY: number | null
    isDragging: boolean
  },
>(
  state: TState,
  toolset: {
    currentTool: Tool
    tools: ToolMap
    setActiveLocal(local: any): void
  },
  localToolContexts: LocalToolContexts,
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

      const local = localToolContexts[toolset.currentTool]
      toolset.setActiveLocal(local)

      toolset.tools[toolset.currentTool]?.onMouseDown?.(
        local,
        x,
        y,
        ...extra,
      )
    },
    pointerMove(x: number, y: number, ...extra: any[]) {
      const local = localToolContexts[toolset.currentTool]

      if (state.mouseDownX !== null && state.mouseDownY !== null) {
        const dx = x - state.mouseDownX
        const dy = y - state.mouseDownY

        if (!state.isDragging &&
          (Math.abs(dx) > state.dragThreshold || Math.abs(dy) > state.dragThreshold)) {

          state.isDragging = true
          state.mouseDragStartX = state.mouseDownX
          state.mouseDragStartY = state.mouseDownY

          toolset.tools[toolset.currentTool]?.onDragStart?.(
            local,
            state.mouseDownX,
            state.mouseDownY,
            ...extra,
          )
        } else {
          toolset.tools[toolset.currentTool]?.onDragMove?.(
            local,
            x,
            y,
            ...extra,
          )
        }
      } else {
        toolset.tools[toolset.currentTool]?.onMouseMove?.(
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
      const local = localToolContexts[toolset.currentTool]

      if (state.isDragging) {
        toolset.tools[toolset.currentTool]?.onDragEnd?.(
          local,
          x,
          y,
          ...extra,
        )
      } else {
        toolset.tools[toolset.currentTool]?.onClick?.(
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

      const local = localToolContexts[toolset.currentTool]
      toolset.tools[toolset.currentTool]?.onMouseLeave?.(
        local,
        ...extra,
      )
    },
  }
}