import { ref, type Ref, toRef, watch, watchEffect } from 'vue'
import { type CanvasEditToolStore, useCanvasEditToolStore } from '../../../lib/store/canvas-edit-tool-store.ts'
import { useUIStore } from '../../../lib/store/ui-store.ts'
import type { ImageDataRef } from '../../../lib/vue/vue-image-data.ts'
import { type BaseToolManagerSettings, defineToolController } from '../_core/_core-editor-types.ts'
import { makeGetCurrentCursorCssClass } from '../_core/controller/CurrentCursorCssClass.ts'
import { makeToolInputCore } from '../_core/controller/ToolInputCore.ts'
import { canvasCoordGetter, useGlobalInput } from '../_core/GlobalInputManager.ts'
import { useBrushCursor } from '../_core/renderers/BrushCursor.ts'
import { makePixelGridLineRenderer } from '../_core/renderers/PixelGridLineRenderer.ts'
import { makCanvasPaintEditorState } from './CanvasPaintEditorState.ts'
import { makeCanvasPaintToolset } from './CanvasPaintToolset.ts'
import { makeCanvasRenderer } from './CanvasRenderer.ts'
import { makeCanvasPaintWriter } from './data/CanvasPaintWriter.ts'

export type CanvasPaintController = ReturnType<typeof useCanvasPaintController>

export function useCanvasPaintController(
  {
    id,
    width,
    height,
    scale = toRef(useUIStore(), 'imgScale'),
    gridColor,
    gridDraw,
    imageDataRef,
    store = useCanvasEditToolStore(),
  }: BaseToolManagerSettings & {
    width: Ref<number>,
    height: Ref<number>,
    imageDataRef: ImageDataRef,
    gridColor: Ref<string>,
    store?: CanvasEditToolStore
  },
) {

  const state = makCanvasPaintEditorState({
    id,
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

  const canvasWriter = makeCanvasPaintWriter({ state, canvasRenderer })

  const toolset = makeCanvasPaintToolset({
    store,
    state,
    canvasRenderer,
    canvasWriter,
  })

  canvasRenderer.setToolset(toolset)

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

  const core = makeToolInputCore(state, toolset)

  const currentCursorCssClass = ref<string | null>(null)
  const getCurrentCursorClass = makeGetCurrentCursorCssClass(toolset)

  return defineToolController()({
    id,
    state,
    canvasRenderer,
    currentCursorCssClass,
    getInputHandlers(canvas) {
      return useGlobalInput({
        getCoordsFromEvent: canvasCoordGetter(canvas, scale),
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
        onHoverStart() {
          currentCursorCssClass.value = getCurrentCursorClass()
        },
        onHoverEnd() {
          currentCursorCssClass.value = null
        },
      })
    },
  })
}