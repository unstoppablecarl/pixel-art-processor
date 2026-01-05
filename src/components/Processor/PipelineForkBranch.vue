<script setup lang="ts">
import { BButtonGroup } from 'bootstrap-vue-next'
import { computed } from 'vue'
import type { NodeId } from '../../lib/pipeline/_types.ts'
import { isBranch, isFork } from '../../lib/pipeline/Node.ts'
import { useBranchHandler } from '../../lib/pipeline/useStepHandler.ts'
import { usePipelineStore } from '../../lib/store/pipeline-store.ts'
import AddNodeAfterDropDown from '../UI/AddNodeAfterDropDown.vue'
import SeedPopOver from '../UI/SeedPopOver.vue'
import PipelineBranch from './PipelineBranch.vue'

const store = usePipelineStore()

const { branchNodeId } = defineProps<{
  branchNodeId: NodeId,
}>()

const branch = useBranchHandler(branchNodeId)

const nodeIds = computed((): NodeId[] => {
  if (!branch) return []
  const ids: NodeId[] = []
  let currentId = store.get(branchNodeId).childIds(store)[0] as NodeId

  while (currentId) {
    ids.push(currentId)
    const current = store.get(currentId)
    if (isFork(current)) {
      break
    }
    let next

    next = current.childIds(store)[0] as NodeId
    currentId = next
    if (isBranch(current)) throw new Error('should not be a branch here')
  }

  return ids
})
</script>
<template>
  <div class="card-header hstack" v-if="branch">
    <div class="me-auto pe-2">Branch {{ branch.branchIndex + 1 }}</div>

    <SeedPopOver class="ms-auto me-1" v-model="branch.seed" />

    <BButtonGroup class="fork-branch-controls">
      <button role="button" class="btn btn-sm btn-danger d-inline-block"
              @click="store.remove(branch.id)">
        <span class="material-symbols-outlined">delete</span>
      </button>

      <button role="button" class="btn btn-sm btn-secondary d-inline-block"
              @click="store.duplicateBranchNode(branchNodeId)">
        <span class="material-symbols-outlined">content_copy</span>
      </button>

      <template v-if="!nodeIds.length">
        <AddNodeAfterDropDown
          size="sm"
          :node-id="branchNodeId"
        />
      </template>
    </BButtonGroup>
  </div>

  <div class="card-body">
    <div class="branch">
      <PipelineBranch
        :node-ids="nodeIds"
      />
    </div>
  </div>
</template>
