import { refDebounced } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { BlendMode, BrushMode, BrushShape, Tool } from '../../components/CanvasEditor/_core-editor-types.ts'
import { type RGBA, RGBA_ERASE, RGBA_WHITE } from '../util/html-dom/ImageData.ts'
import { makeStateMapper } from './_store-helpers.ts'

type SerializedData = {
  currentTool: Tool,

  brushShape: BrushShape,
  brushMode: BrushMode,
  primaryColor: RGBA,
  brushSize: number,
  cursorColor: string,
  selectMoveBlendMode: BlendMode,
  tileMarginCopySize: number,
}

export type CanvasEditToolStore = ReturnType<typeof useCanvasEditToolStore>
export const useCanvasEditToolStore = defineStore('canvas-edit', () => {
  const currentTool = ref<Tool>(Tool.BRUSH)

  const primaryColor = shallowRef<RGBA>(RGBA_WHITE)

  const brushShape = ref<BrushShape>(BrushShape.CIRCLE)
  const brushMode = ref<BrushMode>(BrushMode.ADD)
  const brushSize = shallowRef<number>(10)

  const selectMoveBlendMode = ref<BlendMode>(BlendMode.IGNORE_TRANSPARENT)

  const brushSizeDebounced = refDebounced(brushSize, 200)
  const brushColor = computed(() => brushMode.value === BrushMode.ADD ? primaryColor.value : RGBA_ERASE)
  const brushBitMaskColor = computed(() => brushMode.value === BrushMode.ADD ? RGBA_WHITE : RGBA_ERASE)

  const tileMarginCopySize = ref<number>(1)
  const cursorColor = ref('cyan')

  const mapper = makeStateMapper<SerializedData>(
    {
      currentTool,
      primaryColor,
      brushShape,
      brushMode,
      brushSize,
      cursorColor,
      selectMoveBlendMode,
      tileMarginCopySize,
    },
    {
      currentTool: Tool.BRUSH,
      primaryColor: RGBA_WHITE,
      brushShape: BrushShape.CIRCLE,
      brushMode: BrushMode.ADD,
      cursorColor: 'cyan',
      brushSize: 10,
      selectMoveBlendMode: BlendMode.IGNORE_TRANSPARENT,
      tileMarginCopySize: 1,
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

    cursorColor,
    brushShape,
    brushMode,
    brushSize,

    brushSizeDebounced,
    brushColor,
    brushBitMaskColor,
    selectMoveBlendMode,
    tileMarginCopySize,
  }
}, {
  persist: true,
})

export type GlobalToolContext = ReturnType<typeof useGlobalToolContext>

export function useGlobalToolContext(store: CanvasEditToolStore = useCanvasEditToolStore()) {

  return {
    get brushSize() {
      return store.brushSize
    },
    get brushShape() {
      return store.brushShape
    },
    get brushMode() {
      return store.brushMode
    },
    get brushColor() {
      return store.brushColor
    },
    get selectMoveBlendMode() {
      return store.selectMoveBlendMode
    },
    decreaseBrushSize() {
      store.brushSize--
    },
    increaseBrushSize() {
      store.brushSize++
    },
    setBrushSize(n: number) {
      store.brushSize = n
    },
    setBrushShape(s: BrushShape) {
      store.brushShape = s
    },
    setSelectMoveBlendMode(m: BlendMode) {
      store.selectMoveBlendMode = m
    },
  }
}