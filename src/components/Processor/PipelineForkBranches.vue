<script setup lang="ts">
import { computed } from 'vue'
import type { NodeId } from '../../lib/pipeline/_types.ts'

import { BRANCH_DEF } from '../../lib/pipeline/StepRegistry.ts'
import { usePipelineStore } from '../../lib/store/pipeline-store.ts'
import PipelineForkBranch from './PipelineForkBranch.vue'

const store = usePipelineStore()

const { forkNodeId } = defineProps<{ forkNodeId: NodeId }>()

const branchIds = computed(() => {
  return store.getFork(forkNodeId).branchIds.value
})
</script>
<template>
  <div class="fork-branches">
    <div class="fork-branch-header-spacer">&nbsp;</div>

    <template
      v-for="(branchId, branchIndex) in branchIds"
      :key="`${forkNodeId}-branch-${branchIndex}`"
    >
      <PipelineForkBranch :branch-node-id="branchId" />
    </template>

    <button role="button" class="btn btn-sm btn-secondary" @click="store.add(BRANCH_DEF, forkNodeId)">
      <span class="material-symbols-outlined">add</span> Branch
    </button>
  </div>
</template>
