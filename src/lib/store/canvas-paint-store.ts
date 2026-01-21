import { refDebounced } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { type BrushMode, type BrushShape, Tool } from '../../components/CanvasPaint/renderer.ts'
import { type RGBA, RGBA_ERASE, RGBA_WHITE } from '../util/html-dom/ImageData.ts'

type SerializedData = {
  brushShape: BrushShape,
  brushMode: BrushMode,
  primaryColor: RGBA,
  brushSize: number,
  currentTool: Tool,
}

export const useCanvasPaintStore = defineStore('canvas-paint', () => {
  const brushShape = ref<BrushShape>('circle')
  const brushMode = ref<BrushMode>('add')
  const primaryColor = shallowRef<RGBA>(RGBA_WHITE)
  const brushColor = computed(() => brushMode.value === 'add' ? primaryColor.value : RGBA_ERASE)

  const brushSize = shallowRef<number>(10)
  const brushSizeDebounced = refDebounced(brushSize, 200)
  const currentTool = ref<Tool>(Tool.BRUSH)

  function $reset() {
    brushShape.value = 'circle'
    brushSize.value = 10
    brushMode.value = 'add'
    primaryColor.value = RGBA_WHITE
    currentTool.value = Tool.BRUSH
  }

  function $serializeState(): SerializedData {
    return {
      brushShape: brushShape.value,
      brushSize: brushSize.value,
      brushMode: brushMode.value,
      primaryColor: primaryColor.value,
      currentTool: currentTool.value,
    }
  }

  function $restoreState(data: SerializedData) {
    brushShape.value = data.brushShape
    brushSize.value = data.brushSize
    brushMode.value = data.brushMode
    primaryColor.value = data.primaryColor
    currentTool.value = data.currentTool
  }

  return {
    $reset,
    $serializeState,
    $restoreState,

    brushShape,
    brushSize,
    brushSizeDebounced,

    brushMode,
    primaryColor,
    brushColor,

    currentTool,
  }

}, {
  persist: true,
})