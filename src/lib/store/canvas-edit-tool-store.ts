import { refDebounced } from '@vueuse/core'
import { defineStore } from 'pinia'
import { makeSimplePersistMapper } from 'pinia-simple-persist'
import { type Color32, color32ToCssRGBA, color32ToCssRGBAString, packColor } from 'pixel-data-js'
import { computed, ref, shallowRef } from 'vue'
import {
  BlendMode,
  BrushShape,
  BrushSubTool,
  SelectMoveMode,
  type SubToolOf,
  SubTools,
  Tool,
} from '../../CanvasEditor/_core/_core-editor-types.ts'

type SerializedData = {
  currentTool: Tool,
  currentSubTool: SubToolOf<Tool> | null,

  brushShape: BrushShape,
  primaryColor: Color32,
  brushSize: number,
  cursorColor: Color32,
  selectMoveBlendMode: BlendMode,
  selectFloodContiguous: boolean,
  selectFloodTolerance: number,

  duplicateTileEdges: boolean,
  duplicateTileEdgesBorderThickness: number,
}

const CYAN = packColor(0, 255, 255, 255)

export type CanvasEditToolStore = ReturnType<typeof useCanvasEditToolStore>
export const useCanvasEditToolStore = defineStore('canvas-edit', () => {
  const currentTool = ref<Tool>(Tool.BRUSH)
  const currentSubTool = ref<SubToolOf<Tool> | null>(BrushSubTool.ADD)

  const primaryColor = ref<Color32>(0xffffffff as Color32)

  const brushShape = ref<BrushShape>(BrushShape.CIRCLE)
  const brushSize = shallowRef<number>(10)

  const selectMoveBlendMode = ref<BlendMode>(BlendMode.IGNORE_TRANSPARENT)

  const selectFloodContiguous = ref(true)
  const selectFloodTolerance = ref(0)

  const brushSizeDebounced = refDebounced(brushSize, 200)
  const brushColor = computed(() => primaryColor.value)

  const cursorColor = ref<Color32>(CYAN)
  const cursorColorCss = computed(() => color32ToCssRGBA(cursorColor.value))
  const cursorColorCssString = computed(() => color32ToCssRGBAString(cursorColor.value))

  const duplicateTileEdges = ref(true)
  const duplicateTileEdgesBorderThickness = ref(1)

  // transient non-serialized state
  const selectionMoveMode = ref<SelectMoveMode>(SelectMoveMode.SELECTION)
  const mouseOverSelection = ref(false)
  const brushLockCardinalDirections = ref(false)

  const mapper = makeSimplePersistMapper<SerializedData>(
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
      duplicateTileEdges,
      duplicateTileEdgesBorderThickness,
    },
    {
      currentTool: currentTool.value,
      currentSubTool: currentSubTool.value,
      primaryColor: primaryColor.value,
      brushShape: brushShape.value,
      cursorColor: cursorColor.value,
      brushSize: brushSize.value,
      selectMoveBlendMode: selectMoveBlendMode.value,
      selectFloodContiguous: selectFloodContiguous.value,
      selectFloodTolerance: selectFloodTolerance.value,
      duplicateTileEdges: duplicateTileEdges.value,
      duplicateTileEdgesBorderThickness: duplicateTileEdgesBorderThickness.value,
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

  function setTool<T extends Tool>(tool: T, subTool: SubToolOf<T> | null = null) {
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
    cursorColorCss,
    cursorColorCssString,

    brushShape,
    brushMode,
    brushSize,

    brushSizeDebounced,
    brushColor,

    selectMoveBlendMode,
    selectFloodContiguous,
    selectFloodTolerance,

    duplicateTileEdges,
    duplicateTileEdgesBorderThickness,

    decreaseBrushSize() {
      brushSize.value--
    },
    increaseBrushSize() {
      brushSize.value++
    },

    selectionMoveMode,
    mouseOverSelection,
    brushLockCardinalDirections,
  }
}, {
  persist: true,
})