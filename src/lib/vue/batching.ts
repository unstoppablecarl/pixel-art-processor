import { nextTick } from 'vue'

export function useDirtyBatching<T>(
  processor: (items: Set<T>) => void,
) {
  const dirty = new Set<T>()
  let scheduled = false

  function markDirty(item: T) {
    dirty.add(item)

    if (!scheduled) {
      scheduled = true
      nextTick(() => {
        processor(new Set(dirty))
        dirty.clear()
        scheduled = false
      })
    }
  }

  return { markDirty }
}