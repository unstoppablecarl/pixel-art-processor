<script setup lang="ts">
import { BButtonGroup } from 'bootstrap-vue-next'
import { computed } from 'vue'
import type { AnyBranchNode, AnyForkNode } from '../../lib/pipeline/Node.ts'
import { usePipelineStore } from '../../lib/store/pipeline-store.ts'
import SeedPopOver from '../UI/SeedPopOver.vue'
import AddToBranchStepDropDown from './AddToBranchStepDropDown.vue'
import PipelineBranch from './PipelineBranch.vue'

const store = usePipelineStore()

const { forkStepId, branchIndex } = defineProps<{
  forkStepId: string,
  branchIndex: number
}>()

// Branch = fork.branchIds[branchIndex]
const branch = computed(() => {
  const fork = store.get(forkStepId) as AnyForkNode
  const branchId = fork.branchIds[branchIndex]
  return store.get(branchId) as AnyBranchNode
})

// Build stepIds by walking nextId chain
const stepIds = computed(() => {
  const ids: string[] = []
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
    <div class="me-auto pe-2">Branch {{ branchIndex + 1 }}</div>

    <SeedPopOver class="ms-auto me-1" v-model="branch.seed" />

    <BButtonGroup class="fork-branch-controls">
      <button role="button" class="btn btn-sm btn-danger d-inline-block"
              @click="store.remove(branch.id)">
        <span class="material-symbols-outlined">delete</span>
      </button>

      <button role="button" class="btn btn-sm btn-secondary d-inline-block"
              @click="store.duplicateBranch(forkStepId, branchIndex)">
        <span class="material-symbols-outlined">content_copy</span>
      </button>

      <template v-if="!stepIds.length">
        <AddToBranchStepDropDown :step="store.get(forkStepId)" :branch-index="branchIndex" />
      </template>
    </BButtonGroup>
  </div>

  <div class="card-body">
    <div class="branch">
      <PipelineBranch
        :parent-fork-id="forkStepId"
        :branch-index="branchIndex"
        :step-ids="stepIds"
      />
    </div>
  </div>
</template>
