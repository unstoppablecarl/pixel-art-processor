import { defineStore } from 'pinia'
import { makeSimplePersistMapper } from 'pinia-simple-persist'
import { ref } from 'vue'

type SerializedData = {
  scale: number,
  gridWidth: number,
  gridHeight: number,
  seed: number,
}

export const usePreviewStore = defineStore('html-dom-preview', () => {
  const scale = ref(4)
  const seed = ref(0)

  const gridWidth = ref(10)
  const gridHeight = ref(10)

  const mapper = makeSimplePersistMapper<SerializedData>({
    scale,
    seed,
    gridWidth,
    gridHeight,
  }, {
    scale: scale.value,
    seed: seed.value,
    gridWidth: gridWidth.value,
    gridHeight: gridHeight.value,
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
  }

}, {
  persist: true,
})