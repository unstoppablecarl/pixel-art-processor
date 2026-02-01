import { type Ref, toRef, watch, watchEffect } from 'vue'
import { useUIStore } from '../../../lib/store/ui-store.ts'
import { useDocumentClick } from '../../../lib/util/vue-util.ts'
import type { ImageDataRef } from '../../../lib/vue/vue-image-data.ts'
import {
  type BaseToolManagerSettings,
  DATA_ATTR_EXCLUDE_SELECT_CANCEL_CLICK,
  DATA_LOCAL_TOOL_ID,
  defineToolManager,
  Tool,
} from '../_core-editor-types.ts'
import { useBrushCursor } from '../_support/BrushCursor.ts'
import { makeBrushToolState } from '../_support/BrushToolState.ts'
import { makePixelGridLineRenderer } from '../_support/PixelGridLineRenderer.ts'
import { makeLocalToolContexts } from '../Toolset.ts'
import type {
  BaseLocalToolContext,
  LocalToolContext,
  LocalToolContexts,
  LocalToolStates,
} from './_canvas-paint-editor-types.ts'
import { makCanvasPaintEditorState } from './CanvasPaintEditorState.ts'
import { makeCanvasPaintSelectionToolState } from './CanvasPaintSelectionToolState.ts'
import { type CanvasPaintToolset, useCanvasPaintToolset } from './CanvasPaintToolset.ts'
import { makeCanvasRenderer } from './CanvasRenderer.ts'
import { makeCurrentToolRenderer } from './CurrentToolRenderer.ts'

export type CanvasPaintController = ReturnType<typeof useCanvasPaintController>

export function useCanvasPaintController(
  {
    id,
    width,
    height,
    toolset = useCanvasPaintToolset(),
    scale = toRef(useUIStore(), 'imgScale'),
    gridColor,
    imageDataRef,
  }: BaseToolManagerSettings & {
    toolset?: CanvasPaintToolset,
    width: Ref<number>,
    height: Ref<number>,
    imageDataRef: ImageDataRef
  },
) {

  const state = makCanvasPaintEditorState({
    gridColor,
    scale,
    width,
    height,
    imageDataRef,
  })

  const canvasRenderer = makeCanvasRenderer({
    state,
    getImageData: () => state.imageDataRef.get()!,
  })

  const gridCache = makePixelGridLineRenderer({
    color: gridColor,
    width,
    height,
    scale,
  })
  watch(gridCache.watchTarget, () => canvasRenderer.queueRender())
  canvasRenderer.setPixelGridLineRenderer(gridCache)

  const localToolStates: LocalToolStates = {
    [Tool.BRUSH]: makeBrushToolState({ state }),
    [Tool.SELECT]: makeCanvasPaintSelectionToolState({
      state,
      canvasRenderer,
    }),
  }

  const localBase: BaseLocalToolContext = {
    state,
    canvasRenderer,
  }

  const localToolContexts = makeLocalToolContexts(localBase, localToolStates) as LocalToolContexts

  const currentToolRenderer = makeCurrentToolRenderer({
    toolset: toolset,
    localToolContexts,
  })

  canvasRenderer.setCurrentToolRenderer(currentToolRenderer)

  useDocumentClick((t) => {
    if (toolset.currentTool !== Tool.SELECT) return
    if (t.closest(`[${DATA_ATTR_EXCLUDE_SELECT_CANCEL_CLICK}]`)) return
    if (t.getAttribute(DATA_LOCAL_TOOL_ID) === id) return

    localToolStates.SELECT.clearSelection()
  })

  const uiStore = useUIStore()
  const brushCursor = useBrushCursor()
  watch(brushCursor.watchTarget, () => canvasRenderer.queueRender())

  watchEffect(() => {
    state.imageDataRef.resize(width.value, height.value)
  })

  watch([
    () => uiStore.imgScale,
    width,
    height,
  ], () => {
    canvasRenderer.resize()
    canvasRenderer.queueRender()
  })

  function setMousePos(x: number, y: number) {
    state.mouseX = x
    state.mouseY = y
  }

  return defineToolManager()({
    id,
    state,
    canvasRenderer,
    onGlobalToolChanging(newTool, prevTool) {
      if (prevTool) {
        const local = localToolContexts[prevTool] as LocalToolContext<any>
        toolset.tools[prevTool]?.onGlobalToolChanging?.(local, newTool, prevTool)
      }
    },

    onMouseDown(x: number, y: number): void {
      setMousePos(x, y)
      const local = localToolContexts[toolset.currentTool] as LocalToolContext<any>

      toolset.setActiveLocal(local)

      state.mouseDownX = x
      state.mouseDownY = y
      state.isDragging = false

      toolset.tools[toolset.currentTool]?.onMouseDown?.(local, x, y)
      canvasRenderer.queueRender()
    },
    onMouseMove(x: number, y: number) {
      setMousePos(x, y)
      const local = localToolContexts[toolset.currentTool] as LocalToolContext<any>

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
          )
        } else {
          toolset.tools[toolset.currentTool]?.onDragMove?.(local, x, y)
        }

      } else {
        toolset.tools[toolset.currentTool]?.onMouseMove?.(local, x, y)
      }

      state.mouseLastX = x
      state.mouseLastY = y
    },

    onMouseUp(x: number, y: number) {
      setMousePos(x, y)
      const local = localToolContexts[toolset.currentTool] as LocalToolContext<any>

      if (state.isDragging) {
        toolset.tools[toolset.currentTool]?.onDragEnd?.(local, x, y)
        state.mouseDragStartX = null
        state.mouseDragStartY = null
      } else {
        toolset.tools[toolset.currentTool]?.onClick?.(local, x, y)
      }

      state.mouseDownX = null
      state.mouseDownY = null
      state.isDragging = false
    },
    onMouseLeave() {
      const local = localToolContexts[toolset.currentTool] as LocalToolContext<any>

      state.mouseX = null
      state.mouseY = null

      toolset.tools[toolset.currentTool]?.onMouseLeave?.(local)
      canvasRenderer.queueRender()
    },
  })
}