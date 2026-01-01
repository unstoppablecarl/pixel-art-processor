<script setup lang="ts">
import { BButtonGroup } from 'bootstrap-vue-next'
import { computed } from 'vue'
import type { AnyBranchNode, NodeId } from '../../lib/pipeline/Node.ts'
import { usePipelineStore } from '../../lib/store/pipeline-store.ts'
import SeedPopOver from '../UI/SeedPopOver.vue'
import AddToBranchStepDropDown from './AddToBranchStepDropDown.vue'
import PipelineBranch from './PipelineBranch.vue'

const store = usePipelineStore()

const { branchNodeId } = defineProps<{
  branchNodeId: NodeId,
}>()

const branch = computed(() => store.get(branchNodeId) as AnyBranchNode)

const nodeIds = computed((): NodeId[] => {
  const ids: NodeId[] = []
  let currentId = branch.value.nextId

  while (currentId) {
    ids.push(currentId)
    const next = store.get(currentId).childIds(store)[0]
    currentId = next
  }

  return ids
})
</script>

<template>
  <div class="card-header hstack">
    <div class="me-auto pe-2">Branch {{ branch.branchIndex + 1 }}</div>

    <SeedPopOver class="ms-auto me-1" v-model="branch.seed" />

    <BButtonGroup class="fork-branch-controls">
      <button role="button" class="btn btn-sm btn-danger d-inline-block"
              @click="store.remove(branch.id)">
        <span class="material-symbols-outlined">delete</span>
      </button>

      <button role="button" class="btn btn-sm btn-secondary d-inline-block"
              @click="store.duplicateNode(branchNodeId)">
        <span class="material-symbols-outlined">content_copy</span>
      </button>

      <template v-if="!nodeIds.length">
        <AddToBranchStepDropDown :branch-node-id="branchNodeId" />
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
