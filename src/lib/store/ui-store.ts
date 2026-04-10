import { defineStore } from 'pinia'
import { makeSimplePersistMapper } from 'pinia-simple-persist'
import { ref } from 'vue'

type SerializedData = {
  debugSidebarVisible: boolean,
  imgScale: number,
  showTileIds: boolean
}

export type UIStore = ReturnType<typeof useUIStore>
export const useUIStore = defineStore('ui', () => {
  const debugSidebarVisible = ref<boolean>(false)
  const imgScale = ref(4)
  const showTileIds = ref(false)

  const mapper = makeSimplePersistMapper<SerializedData>(
    {
      debugSidebarVisible,
      imgScale,
      showTileIds,
    },
    {
      debugSidebarVisible: debugSidebarVisible.value,
      imgScale: imgScale.value,
      showTileIds: showTileIds.value,
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
    debugSidebarVisible,
    imgScale,
    showTileIds,
  }
}, {
  persist: true,
})