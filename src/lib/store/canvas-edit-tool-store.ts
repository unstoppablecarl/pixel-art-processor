import { refDebounced } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import {
  BlendMode,
  BrushMode,
  BrushShape,
  SelectSubTool,
  type SubToolOf,
  Tool,
} from '../../components/CanvasEditor/_core-editor-types.ts'
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
  selectFloodContiguous: boolean,
  selectFloodTolerance: number,
  currentSubTool: SubToolOf<Tool>,
}

export type CanvasEditToolStore = ReturnType<typeof useCanvasEditToolStore>
export const useCanvasEditToolStore = defineStore('canvas-edit', () => {
  const currentTool = ref<Tool>(Tool.BRUSH)
  const currentSubTool = ref<SubToolOf<Tool>>(null)

  const primaryColor = shallowRef<RGBA>(RGBA_WHITE)

  const brushShape = ref<BrushShape>(BrushShape.CIRCLE)
  const brushMode = ref<BrushMode>(BrushMode.ADD)
  const brushSize = shallowRef<number>(10)

  const selectMoveBlendMode = ref<BlendMode>(BlendMode.IGNORE_TRANSPARENT)

  const selectFloodContiguous = ref(true)
  const selectFloodTolerance = ref(0)

  const brushSizeDebounced = refDebounced(brushSize, 200)
  const brushColor = computed(() => brushMode.value === BrushMode.ADD ? primaryColor.value : RGBA_ERASE)
  const brushBitMaskColor = computed(() => brushMode.value === BrushMode.ADD ? RGBA_WHITE : RGBA_ERASE)

  const tileMarginCopySize = ref<number>(1)
  const cursorColor = ref('cyan')

  const mapper = makeStateMapper<SerializedData>(
    {
      currentTool,
      currentSubTool,
      primaryColor,
      brushShape,
      brushMode,
      brushSize,
      cursorColor,
      selectMoveBlendMode,
      selectFloodContiguous,
      selectFloodTolerance,
      tileMarginCopySize,
    },
    {
      currentTool: Tool.BRUSH,
      currentSubTool: null,
      primaryColor: RGBA_WHITE,
      brushShape: BrushShape.CIRCLE,
      brushMode: BrushMode.ADD,
      cursorColor: 'cyan',
      brushSize: 10,
      selectMoveBlendMode: BlendMode.IGNORE_TRANSPARENT,
      selectFloodContiguous: true,
      selectFloodTolerance: 0,
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

  function setTool(tool: Tool, subTool?: SubToolOf<Tool> | null) {
    currentTool.value = tool
    if (tool === Tool.SELECT) {
      if (subTool != null) {
        currentSubTool.value = subTool
        return
      }

      if (currentSubTool.value == null) {
        currentSubTool.value = SelectSubTool.RECT
      }
    } else {
      currentSubTool.value = null
    }
  }

  return {
    $reset,
    $serializeState,
    $restoreState,

    setTool,
    currentTool,
    currentSubTool,
    primaryColor,

    cursorColor,
    brushShape,
    brushMode,
    brushSize,

    brushSizeDebounced,
    brushColor,
    brushBitMaskColor,

    selectMoveBlendMode,
    selectFloodContiguous,
    selectFloodTolerance,

    tileMarginCopySize,
    decreaseBrushSize() {
      brushSize.value--
    },
    increaseBrushSize() {
      brushSize.value++
    },
  }
}, {
  persist: true,
})