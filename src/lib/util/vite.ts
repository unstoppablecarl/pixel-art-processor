type HMROptions<T> = {
  key: string
  save: () => T
  restore: (data: T) => void
}

export function handleHMRState<T>(importMetaHot: any, { key, save, restore }: HMROptions<T>) {
  if (!importMetaHot) return

  importMetaHot.dispose((data: any) => {
    data[key] = save()
  })

  const hmrData = importMetaHot.data?.[key]
  if (hmrData !== undefined) {
    restore(hmrData)
  }
}

export function handleNodeConfigHMR<T>(importMetaHot: any, { save, restore }: Omit<HMROptions<T>, 'key'>) {
  handleHMRState(importMetaHot, { key: 'nodeConfig', save, restore } as any)
}
