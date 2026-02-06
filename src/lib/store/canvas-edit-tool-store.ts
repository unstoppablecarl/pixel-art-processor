import { refDebounced } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import {
  BlendMode,
  BrushShape,
  BrushSubTool,
  type SubToolOf,
  SubTools,
  Tool,
} from '../../components/CanvasEditor/_core-editor-types.ts'
import { type RGBA, RGBA_ERASE, RGBA_WHITE } from '../util/html-dom/ImageData.ts'
import { makeStateMapper } from './_store-helpers.ts'

type SerializedData = {
  currentTool: Tool,
  currentSubTool: SubToolOf<Tool> | null,

  brushShape: BrushShape,
  primaryColor: RGBA,
  brushSize: number,
  cursorColor: string,
  selectMoveBlendMode: BlendMode,
  tileMarginCopySize: number,
  selectFloodContiguous: boolean,
  selectFloodTolerance: number,

  duplicateTileEdges: boolean,
  duplicateTileEdgesBorderThickness: number,
}

export type CanvasEditToolStore = ReturnType<typeof useCanvasEditToolStore>
export const useCanvasEditToolStore = defineStore('canvas-edit', () => {
  const currentTool = ref<Tool>(Tool.BRUSH)
  const currentSubTool = ref<SubToolOf<Tool> | null>(null)

  const primaryColor = shallowRef<RGBA>(RGBA_WHITE)

  const brushShape = ref<BrushShape>(BrushShape.CIRCLE)
  const brushSize = shallowRef<number>(10)

  const selectMoveBlendMode = ref<BlendMode>(BlendMode.IGNORE_TRANSPARENT)

  const selectFloodContiguous = ref(true)
  const selectFloodTolerance = ref(0)

  const brushSizeDebounced = refDebounced(brushSize, 200)
  const brushColor = computed(() => brushMode.value === BrushSubTool.ADD ? primaryColor.value : RGBA_ERASE)
  const brushBitMaskColor = computed(() => brushMode.value === BrushSubTool.ADD ? RGBA_WHITE : RGBA_ERASE)

  const tileMarginCopySize = ref<number>(1)
  const cursorColor = ref('cyan')

  const duplicateTileEdges = ref(true)
  const duplicateTileEdgesBorderThickness = ref(1)

  const mapper = makeStateMapper<SerializedData>(
    {
      currentTool,
      currentSubTool,
      primaryColor,
      brushShape,
      brushSize,
      cursorColor,
      selectMoveBlendMode,
      selectFloodContiguous,
      selectFloodTolerance,
      tileMarginCopySize,
      duplicateTileEdges,
      duplicateTileEdgesBorderThickness,
    },
    {
      currentTool: Tool.BRUSH,
      currentSubTool: null,
      primaryColor: RGBA_WHITE,
      brushShape: BrushShape.CIRCLE,
      cursorColor: 'cyan',
      brushSize: 10,
      selectMoveBlendMode: BlendMode.IGNORE_TRANSPARENT,
      selectFloodContiguous: true,
      selectFloodTolerance: 0,
      tileMarginCopySize: 1,
      duplicateTileEdges: true,
      duplicateTileEdgesBorderThickness: 1,
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

  function setTool(tool: Tool, subTool: SubToolOf<Tool> | null = null) {
    currentTool.value = tool
    const hasSubTools = !!SubTools[tool]
    if (!hasSubTools) {
      currentSubTool.value = null
      return
    }

    if (subTool !== null) {
      currentSubTool.value = subTool
      return
    } else {
      currentSubTool.value = Object.keys(SubTools[tool])[0] as SubToolOf<Tool>
    }
  }

  const brushMode = computed(() => {
    if (currentTool.value === Tool.BRUSH) {
      return currentSubTool.value
    }
  })

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

    duplicateTileEdges,
    duplicateTileEdgesBorderThickness,

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