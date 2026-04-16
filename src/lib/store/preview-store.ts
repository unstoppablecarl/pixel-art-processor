import { defineStore } from 'pinia'
import { makeSimplePersistMapper } from 'pinia-simple-persist'
import { type Reactive, reactive, ref } from 'vue'
import { ASSEMBLER_REGISTRY, type AssemblerId } from '../vue/assembler-registry.ts'

type SerializedData = {
  scale: number,
  gridWidth: number,
  gridHeight: number,
  seed: number,
  assemblers: Reactive<AssemblersActive>,
  showEdgeColors: boolean,
  showEdgeColorsOpacity: number,
}

type AssemblersActive = Record<AssemblerId, boolean>

export const usePreviewStore = defineStore('html-dom-preview', () => {
  const scale = ref(4)
  const seed = ref(0)

  const gridWidth = ref(10)
  const gridHeight = ref(10)
  const showEdgeColors = ref(false)
  const showEdgeColorsOpacity = ref(0.5)

  const ASSEMBLER_DEFAULTS = Object.fromEntries(
    Object.keys(ASSEMBLER_REGISTRY).map(k => [k, false]),
  ) as AssemblersActive

  const assemblers = reactive<AssemblersActive>(ASSEMBLER_DEFAULTS)

  const mapper = makeSimplePersistMapper<SerializedData>({
    scale,
    seed,
    gridWidth,
    gridHeight,
    assemblers,
    showEdgeColors,
    showEdgeColorsOpacity,
  }, {
    scale: scale.value,
    seed: seed.value,
    gridWidth: gridWidth.value,
    gridHeight: gridHeight.value,
    assemblers: ASSEMBLER_DEFAULTS,
    showEdgeColors: showEdgeColors.value,
    showEdgeColorsOpacity: showEdgeColorsOpacity.value,
  })

  function $reset() {
    mapper.$reset()
  }

  function $serializeState(): SerializedData {
    return mapper.$serializeState()
  }

  function $restoreState(data: SerializedData) {
    mapper.$restoreState(data)
  }

  return {
    $reset,
    $serializeState,
    $restoreState,
    scale,
    seed,
    gridWidth,
    gridHeight,
    assemblers,
    showEdgeColors,
    showEdgeColorsOpacity
  }

}, {
  persist: true,
})