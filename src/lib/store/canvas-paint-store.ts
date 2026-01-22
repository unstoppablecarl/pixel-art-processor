import { refDebounced } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { BrushMode, BrushShape, Tool } from '../../components/CanvasPaint/renderer.ts'
import { SelectMoveBlendMode } from '../../components/CanvasPaint/tools/select.ts'
import { type RGBA, RGBA_ERASE, RGBA_WHITE } from '../util/html-dom/ImageData.ts'
import { makeStateMapper } from './_store-helpers.ts'

type SerializedData = {
  currentTool: Tool,

  brushShape: BrushShape,
  brushMode: BrushMode,
  primaryColor: RGBA,
  brushSize: number,

  selectMoveBlendMode: SelectMoveBlendMode,
}

export const useCanvasPaintStore = defineStore('canvas-paint', () => {
  const currentTool = ref<Tool>(Tool.BRUSH)

  const primaryColor = shallowRef<RGBA>(RGBA_WHITE)

  const brushShape = ref<BrushShape>(BrushShape.CIRCLE)
  const brushMode = ref<BrushMode>(BrushMode.ADD)
  const brushSize = shallowRef<number>(10)

  const selectMoveBlendMode = ref<SelectMoveBlendMode>(SelectMoveBlendMode.IGNORE_TRANSPARENT)

  const brushSizeDebounced = refDebounced(brushSize, 200)
  const brushColor = computed(() => brushMode.value === BrushMode.ADD ? primaryColor.value : RGBA_ERASE)
  const brushBitMaskColor = computed(() => brushMode.value === BrushMode.ADD ? RGBA_WHITE : RGBA_ERASE)

  const mapper = makeStateMapper<SerializedData>(
    {
      currentTool,
      primaryColor,
      brushShape,
      brushMode,
      brushSize,
      selectMoveBlendMode,
    },
    {
      currentTool: Tool.BRUSH,
      primaryColor: RGBA_WHITE,
      brushShape: BrushShape.CIRCLE,
      brushMode: BrushMode.ADD,
      brushSize: 10,
      selectMoveBlendMode: SelectMoveBlendMode.IGNORE_TRANSPARENT,
    },
  )

  function $reset() {
    mapper.$reset()
  }

  function $serializeState(): SerializedData {
    return {
      ...mapper.$serializeState(),
    }
  }

  function $restoreState(data: SerializedData) {
    mapper.$restoreState(data)
  }

  return {
    $reset,
    $serializeState,
    $restoreState,

    currentTool,
    primaryColor,

    brushShape,
    brushMode,
    brushSize,

    brushSizeDebounced,
    brushColor,
    brushBitMaskColor,
    selectMoveBlendMode,
  }
}, {
  persist: true,
})