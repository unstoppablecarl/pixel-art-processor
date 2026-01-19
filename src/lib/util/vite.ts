import type { AnyInitializedNode } from '../pipeline/Node.ts'

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

export function handleNodeConfigHMR(importMetaHot: any, node: AnyInitializedNode) {
  handleHMRState(importMetaHot, {
    key: 'nodeConfig',
    save: () => node.handler.serializeConfig(node.config),
    restore: (value: any) => node.hotLoadConfig(value),
  } as any)
}
