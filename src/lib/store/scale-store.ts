import { defineStore } from 'pinia'
import { ref } from 'vue'

type SerializedData = {
  scale: number,
  previewScale: number
}

export const useScaleStore = defineStore('image-scale', () => {

  const scale = ref(3)
  const previewScale = ref(3)

  function $reset() {
    scale.value = 3
    previewScale.value = 3
  }

  function $serializeState(): SerializedData {
    return {
      scale: scale.value,
      previewScale: previewScale.value,
    }
  }

  function $restoreState(data: SerializedData) {
    scale.value = data.scale
    previewScale.value = data.previewScale
  }

  return {
    $reset,
    $serializeState,
    $restoreState,
    scale,
    previewScale
  }

}, {
  persist: true,
})