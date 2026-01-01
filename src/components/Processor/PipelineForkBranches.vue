<script setup lang="ts">
import { computed } from 'vue'
import type { AnyForkNode } from '../../lib/pipeline/Node.ts'
import { BRANCH_DEF } from '../../lib/pipeline/StepRegistry.ts'
import { usePipelineStore } from '../../lib/store/pipeline-store.ts'
import PipelineForkBranch from './PipelineForkBranch.vue'

const store = usePipelineStore()

const { forkStepId } = defineProps<{ forkStepId: string }>()

const fork = computed(() => store.get(forkStepId) as AnyForkNode)
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
      <PipelineForkBranch :fork-step-id="branchId" :branch-index="branchIndex" />
    </div>

    <button role="button" class="btn btn-sm btn-secondary" @click="store.addBranch(BRANCH_DEF, forkStepId)">
      <span class="material-symbols-outlined">add</span> Branch
    </button>
  </div>
</template>
