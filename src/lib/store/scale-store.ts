import { defineStore } from 'pinia'
import { ref } from 'vue'

type SerializedData = {
  scale: number
}

export const useScaleStore = defineStore('image-scale', () => {

  const scale = ref(3)

  function $reset() {
    scale.value = 3
  }

  function $serializeState(): SerializedData {
    return {
      scale: scale.value,
    }
  }

  // Custom restoration method for the plugin
  function $restoreState(data: SerializedData) {
    scale.value = data.scale
  }

  return {
    $reset,
    $serializeState,
    $restoreState,
    scale,
  }

}, {
  persist: true,
})