<script setup lang="ts">
import { computed } from 'vue'
import { useStepStore } from '../../lib/store/step-store.ts'
import PipelineForkBranch from './PipelineForkBranch.vue'

const store = useStepStore()

const {
  forkStepId,
} = defineProps<{
  forkStepId: string,
}>()

const fork = computed(() => store.getFork(forkStepId))

</script>
<template>
  <div class="fork-branches">
    <div class="fork-branch-header-spacer">
      &nbsp;
    </div>

    <div
      v-for="(_branch, branchIndex) in store.getBranches(fork.id)"
      :key="`${fork.id}-branch-${branchIndex}`"
      class="card card-fork-branch"
    >
      <PipelineForkBranch :fork-step-id="forkStepId" :branch-index="branchIndex" />
    </div>

    <button role="button" class="btn btn-sm btn-secondary" @click="store.addBranch(fork.id)">
      <span class="material-symbols-outlined">add</span> Branch
    </button>
  </div>
</template>