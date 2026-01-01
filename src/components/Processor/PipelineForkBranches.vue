<script setup lang="ts">
import { computed } from 'vue'
import type { AnyForkNode, NodeId } from '../../lib/pipeline/Node.ts'
import { BRANCH_DEF } from '../../lib/pipeline/StepRegistry.ts'
import { usePipelineStore } from '../../lib/store/pipeline-store.ts'
import PipelineForkBranch from './PipelineForkBranch.vue'

const store = usePipelineStore()

const { forkNodeId } = defineProps<{ forkNodeId: NodeId }>()

const fork = computed(() => store.get(forkNodeId) as AnyForkNode)
const branches = computed(() => fork.value.branchIds)
</script>

<template>
  <div class="fork-branches">
    <div class="fork-branch-header-spacer">&nbsp;</div>

    <div
      v-for="(branchId, branchIndex) in branches"
      :key="`${fork.id}-branch-${branchIndex}`"
      class="card card-fork-branch"
    >
      <PipelineForkBranch :branch-node-id="branchId" />
    </div>

    <button role="button" class="btn btn-sm btn-secondary" @click="store.add(BRANCH_DEF, forkNodeId)">
      <span class="material-symbols-outlined">add</span> Branch
    </button>
  </div>
</template>
