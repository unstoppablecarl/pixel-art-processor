import { createHistory } from '@reddojs/core'
import type { ToastOrchestratorCreateParam } from 'bootstrap-vue-next'
import { computed, ref } from 'vue'
import { useDebouncedToast } from '../../vue/toast.ts'

export type History = ReturnType<typeof createHistory>

let HISTORY: History | undefined
let VUE_HISTORY: VueHistory | undefined
let historyUnsub: (() => void) | undefined

const canUndoRef = ref(false)
const canRedoRef = ref(false)

const canUndo = computed(() => canUndoRef.value)
const canRedo = computed(() => canRedoRef.value)

export function setHistory(history: History) {
  HISTORY = history
  canUndoRef.value = HISTORY.canUndo
  canRedoRef.value = HISTORY.canRedo

  historyUnsub = HISTORY.subscribe(() => {
    canUndoRef.value = HISTORY!.canUndo
    canRedoRef.value = HISTORY!.canRedo
  })

  return historyUnsub
}

export type VueHistory = ReturnType<typeof makeVueHistory>

const toastDefaults: ToastOrchestratorCreateParam = {
  position: 'bottom-center',
  autoHide: true,
  modelValue: 600,
  noProgress: true,
  noCloseButton: true,
}

function makeVueHistory(
  toast: (options: ToastOrchestratorCreateParam) => void,
  history: History,
) {
  function undo() {
    if (!history.canUndo) {
      toast({
        ...toastDefaults,
        body: 'No Undos',
      })
      return
    }
    history.undo()
  }

  function redo() {
    if (!history.canRedo) {
      toast({
        body: 'No Redos',
        ...toastDefaults,
      })
      return
    }
    history.redo()
  }

  function dispose() {
    historyUnsub?.()
    VUE_HISTORY = undefined
    HISTORY = undefined
    canUndoRef.value = false
    canRedoRef.value = false
  }

  return {
    history,
    canUndo,
    canRedo,
    undo,
    redo,
    dispose,
  }
}

function HMRStore() {
  if (HISTORY) {
    import.meta.hot!.data.history = HISTORY
  }

  historyUnsub?.()
  VUE_HISTORY = undefined
  historyUnsub = undefined
}

function HMRLoad() {
  const savedHistory = import.meta.hot?.data?.history as History | undefined
  if (savedHistory) {
    setHistory(savedHistory)
  }
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    HMRStore()
  })

  import.meta.hot.accept(() => {
    HMRLoad()
  })
  HMRLoad()
}

export function useHistory(): VueHistory {
  if (!VUE_HISTORY) {
    const toast = useDebouncedToast()
    VUE_HISTORY = makeVueHistory(toast, getHistory())
  }

  return VUE_HISTORY
}

export function getHistory(): History {
  if (!HISTORY) throw new Error('setHistory() not called in main.js')
  return HISTORY
}