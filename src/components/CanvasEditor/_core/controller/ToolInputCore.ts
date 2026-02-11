import { useDocumentClick } from '../../../../lib/util/vue-util.ts'
import { type BaseEditorState, DATA_LOCAL_TOOL_ID, type ToolHandlersRecord } from '../_core-editor-types.ts'
import type { Toolset } from '../Toolset.ts'

export function makeToolInputCore<
  H extends ToolHandlersRecord<any>
>(
  state: BaseEditorState,
  toolset: Toolset<H>,
) {

  useDocumentClick((t, e) => {
    const onClick = toolset.currentToolHandler.onDocumentClick
    if (!onClick) return
    if (state.isDragging) return
    if (state.mouseDownX !== null || state.mouseDownY !== null) return
    // is tool owned canvas
    if (t.getAttribute(DATA_LOCAL_TOOL_ID) === state.id) return
    onClick(t, e)
  })

  return {
    pointerDown(x: number, y: number, ...extra: any[]) {
      state.mouseDownX = x
      state.mouseDownY = y
      state.mouseLastX = x
      state.mouseLastY = y
      state.mouseDragStartX = null
      state.mouseDragStartY = null
      state.isDragging = false

      toolset.currentToolHandler?.onMouseDown?.(
        x,
        y,
        ...extra,
      )
    },
    pointerMove(x: number, y: number, ...extra: any[]) {
      if (state.mouseDownX !== null && state.mouseDownY !== null) {
        const dx = x - state.mouseDownX
        const dy = y - state.mouseDownY

        if (!state.isDragging &&
          (Math.abs(dx) > state.dragThreshold || Math.abs(dy) > state.dragThreshold)) {

          state.isDragging = true
          state.mouseDragStartX = state.mouseDownX
          state.mouseDragStartY = state.mouseDownY

          toolset.currentToolHandler?.onDragStart?.(
            state.mouseDownX,
            state.mouseDownY,
            ...extra,
          )
        } else {
          toolset.currentToolHandler?.onDragMove?.(
            x,
            y,
            ...extra,
          )
        }
      } else {
        toolset.currentToolHandler?.onMouseMove?.(
          x,
          y,
          ...extra,
        )
      }

      state.mouseLastX = x
      state.mouseLastY = y
    },
    pointerUp(x: number, y: number, ...extra: any[]) {
      if (state.isDragging) {
        toolset.currentToolHandler?.onDragEnd?.(
          x,
          y,
          ...extra,
        )
      } else {
        toolset.currentToolHandler?.onClick?.(
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

      toolset.currentToolHandler?.onMouseLeave?.(
        ...extra,
      )
    },
  }
}