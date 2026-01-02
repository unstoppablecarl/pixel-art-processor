<script setup lang="ts">
import { computed } from 'vue'
import { BRANCH_DEF, type NodeId } from '../../lib/pipeline/Node.ts'
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

    <div
      v-for="(branchId, branchIndex) in branchIds"
      :key="`${forkNodeId}-branch-${branchIndex}`"
      class="card card-fork-branch"
    >
      <PipelineForkBranch :branch-node-id="branchId" />
    </div>

    <button role="button" class="btn btn-sm btn-secondary" @click="store.add(BRANCH_DEF, forkNodeId)">
      <span class="material-symbols-outlined">add</span> Branch
    </button>
  </div>
</template>
