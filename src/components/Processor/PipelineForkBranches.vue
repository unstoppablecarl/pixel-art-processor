<script setup lang="ts">
import { BButtonGroup } from 'bootstrap-vue-next'
import { computed } from 'vue'
import { useStepStore } from '../../lib/store/step-store.ts'
import AddToBranchStepDropDown from './AddToBranchStepDropDown.vue'
import PipelineBranch from './PipelineBranch.vue'

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
      v-for="({stepIds: branchStepIds}, branchIndex) in store.getBranches(fork.id)"
      :key="`${fork.id}-branch-${branchIndex}`"
      class="card card-fork-branch"
    >

      <div class="card-header hstack">
        <div class="me-auto pe-2">
          Branch {{ branchIndex + 1 }}
        </div>

        <BButtonGroup class="fork-branch-controls">

          <button role="button" class="btn btn-sm btn-danger d-inline-block"
                  @click="store.removeBranch(fork.id, branchIndex)">
            <span class="material-symbols-outlined">delete</span>
          </button>
          <button role="button" class="btn btn-sm btn-secondary d-inline-block"
                  @click="store.duplicateBranch(fork.id, branchIndex)">
            <span class="material-symbols-outlined">content_copy</span>
          </button>

          <template v-if="!branchStepIds.length">
            <AddToBranchStepDropDown :step="store.get(fork.id)" :branch-index="branchIndex" />
          </template>
        </BButtonGroup>
      </div>

      <div class="card-body">

        <div class="branch">
          <PipelineBranch
            :parent-fork-id="fork.id"
            :branch-index="branchIndex"
            :step-ids="branchStepIds"
          />
        </div>
      </div>
    </div>

    <button role="button" class="btn btn-sm btn-secondary" @click="store.addBranch(fork.id)">
      <span class="material-symbols-outlined">add</span> Branch
    </button>
  </div>
</template>