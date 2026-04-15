import { ref, type Ref, toRef, watch, watchEffect } from 'vue'
import { type CanvasEditToolStore, useCanvasEditToolStore } from '../../lib/store/canvas-edit-tool-store.ts'
import { useUIStore } from '../../lib/store/ui-store.ts'
import type { PixelDataRef } from '../../lib/vue/PixelDataRef.ts'
import { type BaseToolManagerSettings, defineToolController } from '../_core/_core-editor-types.ts'
import { makeToolInputCore } from '../_core/controller/ToolInputCore.ts'
import { useBrushCursor } from '../_core/data/Brush.ts'
import { makeBaseInputHandlers } from '../_core/GlobalInputManager.ts'
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
    showGridColor,
    showGrid,
    pixelDataRef,
    store = useCanvasEditToolStore(),
  }: BaseToolManagerSettings & {
    width: Ref<number>,
    height: Ref<number>,
    pixelDataRef: PixelDataRef,
    store?: CanvasEditToolStore
  },
) {
  const currentCursorCssClass = ref<string | null>(null)

  const state = makCanvasPaintEditorState({
    id,
    showGrid,
    showGridColor,
    scale,
    width,
    height,
    pixelDataRef,
  })

  const gridCache = makePixelGridLineRenderer({
    color: showGridColor,
    width,
    height,
    scale,
    visible: showGrid,
  })

  watch(gridCache.watchTarget, () => canvasRenderer.queueRender())

  const canvasRenderer = makeCanvasRenderer({
    state,
    gridCache,
    getImageData: () => state.pixelDataRef.getImageData()!,
  })

  const canvasWriter = makeCanvasPaintWriter({ state, canvasRenderer })

  const toolset = makeCanvasPaintToolset({
    store,
    state,
    canvasRenderer,
    canvasWriter,
    currentCursorCssClass,
  })

  canvasRenderer.setToolset(toolset)

  const uiStore = useUIStore()
  const brushCursor = useBrushCursor()
  watch(brushCursor.watchTarget, () => {
    canvasRenderer.queueRender()
  })

  watchEffect(() => {
    state.pixelDataRef.resize(width.value, height.value)
  })

  watch(showGrid, () => canvasRenderer.queueRender())

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

  const input = makeToolInputCore(state, toolset)

  return defineToolController()({
    id,
    state,
    canvasRenderer,
    getInputHandlers(canvas) {
      return makeBaseInputHandlers({
        currentCursorCssClass,
        toolset,
        scale,
        canvas,
        input: {
          onMouseDown(x: number, y: number) {
            setMousePos(x, y)
            input.pointerDown(x, y)
            canvasRenderer.queueRender()
          },
          onMouseMove(x: number, y: number) {
            setMousePos(x, y)
            input.pointerMove(x, y)
          },
          onMouseUp(x: number, y: number) {
            setMousePos(x, y)
            input.pointerUp(x, y)
          },
          onMouseLeave() {
            if (state.isDragging) return

            state.mouseX = null
            state.mouseY = null

            input.pointerLeave()
            canvasRenderer.queueRender()
          },
        },
      })
    },
  })
}