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

type HMRConfigNode = {
  config: any
  handler: {
    serializeConfig(config: any): any
  }
  hotLoadConfig(serializedConfig: any): void
}

export function handleNodeConfigHMR(importMetaHot: any, node: HMRConfigNode) {
  handleHMRState(importMetaHot, {
    key: 'nodeConfig',
    save: () => node.handler.serializeConfig(node.config),
    restore: (value: any) => node.hotLoadConfig(value),
  } as any)
}

