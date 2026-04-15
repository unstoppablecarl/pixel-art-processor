import { usePipelineStore } from '../pipeline-store.ts'

function getStores() {
  return [
    usePipelineStore(),
  ]
}

export function resetStores() {
  window.localStorage.clear()
  getStores().forEach((store) => {
    store.$reset()
  })
}

export function disposeStores() {
  getStores().forEach((store) => {
    store.$dispose()
  })
}

export function makeSaveFileData() {
  const result: any = {
    save_schema_version: 1,
  }

  getStores().forEach((store) => {
    const key = store.$id
    result[key] = store.$serializeState()
  })

  return result
}

export function loadSaveFileData(data: Record<string, any>) {
  data = migrateLoadData(data)

  getStores().forEach((store) => {
    const storeId = store.$id
    store.$reset()
    store.$restoreState(data[storeId])
  })
}

export function migrateLoadData(data: Record<string, any>) {
  if (data.save_schema_version === 1) {
  }

  return data
}