import { defineStore } from 'pinia'
import { ref } from 'vue'

type SerializedData = {
  scale: number,
  gridWidth: number,
  gridHeight: number,
  seed: number,
}

export const usePreviewStore = defineStore('image-preview', () => {
  const scale = ref(4)
  const seed = ref(0)

  const gridWidth = ref(10)
  const gridHeight = ref(10)

  function $reset() {
    scale.value = 4
    seed.value = 0
    gridWidth.value = 10
    gridHeight.value = 10
  }

  function $serializeState(): SerializedData {
    return {
      scale: scale.value,
      gridWidth: gridWidth.value,
      gridHeight: gridHeight.value,
      seed: seed.value
    }
  }

  function $restoreState(data: SerializedData) {
    scale.value = data.scale
    gridWidth.value = data.gridWidth
    gridHeight.value = data.gridHeight
    seed.value = data.seed
  }

  return {
    $reset,
    $serializeState,
    $restoreState,
    scale,
    seed,
    gridWidth,
    gridHeight
  }

}, {
  persist: true,
})