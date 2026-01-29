import { defineStore } from 'pinia'
import { ref } from 'vue'
import { makeStateMapper } from './_store-helpers.ts'

type SerializedData = {
  debugSidebarVisible: boolean,
  imgScale: number,
}

export type UIStore = ReturnType<typeof useUIStore>
export const useUIStore = defineStore('ui', () => {
  const debugSidebarVisible = ref<boolean>(false)
  const imgScale = ref(4)

  const mapper = makeStateMapper<SerializedData>(
    {
      debugSidebarVisible,
      imgScale,
    },
    {
      debugSidebarVisible: false,
      imgScale: 4,
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
  }
}, {
  persist: true,
})