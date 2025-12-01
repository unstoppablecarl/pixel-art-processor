import type { PiniaPluginContext } from 'pinia'
import 'pinia'

export interface PersistOptions {
  key?: string
  storage?: Storage
  serializer?: {
    serialize: (value: any) => string
    deserialize: (value: string) => any
  }
  debounce?: number
  beforeRestore?: (context: PiniaPluginContext) => void
  afterRestore?: (context: PiniaPluginContext) => void
}

export function createPersistedState(globalOptions: PersistOptions = {}) {
  return (context: PiniaPluginContext) => {
    const { store, options } = context

    // Check if this store has persist option
    const persist = options.persist as PersistOptions | undefined
    if (!persist) return

    const {
      key = `pinia-${store.$id}`,
      storage = localStorage,
      serializer = {
        serialize: JSON.stringify,
        deserialize: JSON.parse,
      },
      debounce = 300,
      beforeRestore,
      afterRestore,
    } = { ...globalOptions, ...persist }

    // Restore from storage
    const restoreState = () => {
      beforeRestore?.(context)

      const stored = storage.getItem(key)
      if (!stored) return

      const data = serializer.deserialize(stored)

      // Call custom restore method if provided by the store
      if (!(typeof store.$restoreState === 'function')) {
        throw new Error('store must have $restoreState()')
      }

      store.$restoreState(data)

      afterRestore?.(context)
    }

    // Save to storage
    const saveState = () => {
      let state: any

      if (!(typeof store.$serializeState === 'function')) {
        throw new Error('store must have $serializeState()')
      }

      state = store.$serializeState()

      const serialized = serializer.serialize(state)
      storage.setItem(key, serialized)
    }

    // Debounced save
    let saveTimeout: ReturnType<typeof setTimeout> | null = null
    const debouncedSave = () => {
      if (saveTimeout) clearTimeout(saveTimeout)
      saveTimeout = setTimeout(saveState, debounce)
    }

    // Watch for changes and persist
    store.$subscribe(() => {
      debouncedSave()
    }, { detached: true })

    // Restore state on initialization
    restoreState()
  }
}

declare module 'pinia' {
  export interface DefineStoreOptionsBase<S, Store> {
    persist?: PersistOptions | boolean
  }

  export interface PiniaCustomProperties {
    $persist: () => void
    $restoreState?: (data: any) => void
    $serializeState?: () => any
  }
}