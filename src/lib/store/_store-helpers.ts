export function makeStateMapper<T extends Record<string, any>>(
  refs: { [K in keyof T]: { value: T[K] } },
  defaults: T,
) {
  return {
    $serializeState(): T {
      const out = {} as T
      for (const key in refs) {
        out[key] = refs[key].value
      }
      return out
    },

    $restoreState(data: T) {
      for (const key in refs) {
        refs[key].value = data[key]
      }
    },

    $reset() {
      for (const key in refs) {
        refs[key].value = defaults[key]
      }
    },
  }
}
