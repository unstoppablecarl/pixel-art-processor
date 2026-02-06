import { createHistory } from '@reddojs/core'
import { computed, ref } from 'vue'

export type History = ReturnType<typeof createHistory>

export let HISTORY: History | undefined

const canUndoRef = ref(false)
const canRedoRef = ref(false)

const canUndo = computed(() => canUndoRef.value)
const canRedo = computed(() => canRedoRef.value)

let unsub: (() => void) | undefined

export function setHistory(history: History) {
  unsub?.()

  HISTORY = history
  canUndoRef.value = HISTORY.canUndo
  canRedoRef.value = HISTORY.canRedo

  unsub = HISTORY.subscribe(() => {
    canUndoRef.value = HISTORY!.canUndo
    canRedoRef.value = HISTORY!.canRedo
  })

  return unsub
}

export function useHistory() {
  return {
    history: HISTORY,
    canUndo,
    canRedo,
  }
}

export function getHistory(): History {
  if (!HISTORY) throw new Error('setHistory() not called in main.js')
  return HISTORY
}