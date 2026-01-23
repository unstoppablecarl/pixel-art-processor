import { onUnmounted } from 'vue'
import { Tool, type ToolHandler } from './_canvas-editor-types.ts'
import { makeEditorState } from './EditorState.ts'
import { useGlobalToolManager } from './GlobalToolManager.ts'
import { makeRenderer } from './renderer.ts'

export type LocalToolManager = ReturnType<typeof makeLocalToolManager>

export function makeLocalToolManager(global = useGlobalToolManager()) {
  const state = makeEditorState()
  const renderer = makeRenderer(state, global.toolContext)
  const local = { state, renderer }

  const toolInstances: ! Record<Tool, ToolHandler> = {}
  for (const key in global.toolFactories) {
    toolInstances[key as Tool] = global.toolFactories[key as Tool]() as ToolHandler
  }

  const localToolManager = {
    state,
    renderer,
    toolInstances,

    onGlobalToolChanging(oldTool, newTool) {
      toolInstances[oldTool]?.onGlobalToolChanging?.(local, oldTool, newTool)
    },

    onMouseDown(x, y) {
      global.setActiveLocal(local)

      state.mouseDownX = x
      state.mouseDownY = y
      state.isDragging = false

      toolInstances[global.currentTool]?.onMouseDown?.(local, x, y)
      renderer.queueRender()
    },

    onMouseMove(x, y) {
      state.cursorX = x
      state.cursorY = y

      if (state.mouseDownX !== null) {
        const dx = x - state.mouseDownX
        const dy = y - state.mouseDownY

        if (!state.isDragging &&
          (Math.abs(dx) > state.dragThreshold || Math.abs(dy) > state.dragThreshold)) {
          state.isDragging = true
          toolInstances[global.currentTool]?.onDragStart?.(local, state.mouseDownX, state.mouseDownY)
        }

        if (state.isDragging) {
          toolInstances[global.currentTool]?.onDragMove?.(local, x, y)
        } else {
          toolInstances[global.currentTool]?.onMouseMove?.(local, x, y)
        }
      }

      state.lastX = x
      state.lastY = y
    },

    onMouseUp(x, y) {
      if (state.isDragging) {
        toolInstances[global.currentTool]?.onDragEnd?.(local, x, y)
      } else {
        toolInstances[global.currentTool]?.onClick?.(local, x, y)
      }

      state.mouseDownX = null
      state.mouseDownY = null
      state.isDragging = false
    },

    onMouseLeave() {
      toolInstances[global.currentTool]?.onMouseLeave?.(local)
      renderer.queueRender()
    },

    currentToolPixelOverlayDraw(ctx) {
      toolInstances[global.currentTool]?.pixelOverlayDraw?.(local, ctx)
    },

    currentToolScreenOverlayDraw(ctx) {
      toolInstances[global.currentTool]?.screenOverlayDraw?.(local, ctx)
    },
  }

  global.registerLocal(localToolManager)
  onUnmounted(() => global.unregisterLocal(localToolManager))

  return localToolManager
}
