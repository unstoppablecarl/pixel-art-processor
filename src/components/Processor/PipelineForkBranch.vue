<script setup lang="ts">
import { BButtonGroup } from 'bootstrap-vue-next'
import { computed } from 'vue'
import { useStepStore } from '../../lib/store/step-store.ts'
import SeedPopOver from '../UI/SeedPopOver.vue'
import AddToBranchStepDropDown from './AddToBranchStepDropDown.vue'
import PipelineBranch from './PipelineBranch.vue'

const store = useStepStore()

const {
  forkStepId,
  branchIndex,
} = defineProps<{
  forkStepId: string,
  branchIndex: number
}>()

const branch = computed(() => store.getBranch(forkStepId, branchIndex))

const branchSeed = computed({
  get: () => branch.value.seed,
  set(value: number) {
    store.setBranchSeed(forkStepId, branchIndex, value)
  },
})

</script>
<template>

  <div class="card-header hstack">
    <div class="me-auto pe-2">
      Branch {{ branchIndex + 1 }}
    </div>

    <SeedPopOver class="ms-auto me-1" v-model="branchSeed" />
    <BButtonGroup class="fork-branch-controls">
      <button role="button" class="btn btn-sm btn-danger d-inline-block"
              @click="store.removeBranch(forkStepId, branchIndex)">
        <span class="material-symbols-outlined">delete</span>
      </button>
      <button role="button" class="btn btn-sm btn-secondary d-inline-block"
              @click="store.duplicateBranch(forkStepId, branchIndex)">
        <span class="material-symbols-outlined">content_copy</span>
      </button>

      <template v-if="!branch.stepIds.length">
        <AddToBranchStepDropDown :step="store.get(forkStepId)" :branch-index="branchIndex" />
      </template>
    </BButtonGroup>
  </div>

  <div class="card-body">

    <div class="branch">
      <PipelineBranch
        :parent-fork-id="forkStepId"
        :branch-index="branchIndex"
        :step-ids="branch.stepIds"
      />
    </div>
  </div>
</template>
