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
import { useBrushCursor } from '../_support/renderers/BrushCursor.ts'
import { makeBrushToolState } from '../_support/tools/BrushToolState.ts'
import { canvasCoordGetter, useGlobalInput } from '../_support/GlobalInputManager.ts'
import { makeGlobalToolChangeHandler } from '../_support/GlobalToolChangeHandler.ts'
import { makePixelGridLineRenderer } from '../_support/renderers/PixelGridLineRenderer.ts'
import { makeToolInputCore } from '../_support/ToolInputCore.ts'
import { makeLocalToolContexts } from '../Toolset.ts'
import type { BaseLocalToolContext, LocalToolContexts, LocalToolStates } from './_canvas-paint-editor-types.ts'
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
    gridDraw,
    imageDataRef,
  }: BaseToolManagerSettings & {
    toolset?: CanvasPaintToolset,
    width: Ref<number>,
    height: Ref<number>,
    imageDataRef: ImageDataRef,
    gridColor: Ref<string>,
  },
) {

  const state = makCanvasPaintEditorState({
    gridDraw,
    scale,
    width,
    height,
    imageDataRef,
  })

  const gridCache = makePixelGridLineRenderer({
    color: gridColor,
    width,
    height,
    scale,
  })
  watch(gridCache.watchTarget, () => canvasRenderer.queueRender())

  const canvasRenderer = makeCanvasRenderer({
    state,
    gridCache,
    getImageData: () => state.imageDataRef.get()!,
  })

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
    if (state.isDragging) return
    if (toolset.currentTool !== Tool.SELECT) return
    if (state.mouseDownX !== null || state.mouseDownY !== null) return
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

  watch(gridDraw, () => canvasRenderer.queueRender())

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

  const core = makeToolInputCore(state, toolset, localToolContexts)

  return defineToolManager()({
    id,
    state,
    canvasRenderer,
    getInputHandlers(canvas) {
      return useGlobalInput({
        getCoordsFromEvent: canvasCoordGetter(canvas, state.scale),
        onMouseDown(x: number, y: number) {
          setMousePos(x, y)
          core.pointerDown(x, y)
          canvasRenderer.queueRender()
        },
        onMouseMove(x: number, y: number) {
          setMousePos(x, y)
          core.pointerMove(x, y)
        },
        onMouseUp(x: number, y: number) {
          setMousePos(x, y)
          core.pointerUp(x, y)
        },
        onMouseLeave() {
          if (state.isDragging) return

          state.mouseX = null
          state.mouseY = null

          core.pointerLeave()
          canvasRenderer.queueRender()
        },
      })
    },
    onGlobalToolChanging: makeGlobalToolChangeHandler(toolset, localToolContexts),
  })
}