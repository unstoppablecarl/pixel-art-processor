import { computed } from 'vue'
import type { NodeId } from '../../../lib/pipeline/_types.ts'
import type { AnyBranchNode } from '../../../lib/pipeline/Node.ts'
import { usePipelineStore } from '../../../lib/store/pipeline-store.ts'

export function useSiblingBranchVariantsOf(parentBranchId: NodeId) {
  const store = usePipelineStore()

  return computed((): AnyBranchNode[] => {
    const branch = store.maybeGetBranch(parentBranchId)
    if (!branch) return []

    const fork = branch.maybeGetPrev(store)
    if(!fork) return []

    return fork.branchIds.value.map(store.getBranch)
      .filter((b): b is AnyBranchNode => !!b)
      .filter((otherBranch) => {
        const id = otherBranch?.config?.parentBranchId ??
          otherBranch?.loadSerialized?.config?.parentBranchId

        return id === parentBranchId
      })
  })
}
