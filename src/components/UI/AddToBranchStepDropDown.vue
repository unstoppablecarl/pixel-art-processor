<script setup lang="ts">
import { BDropdown, BDropdownItem } from 'bootstrap-vue-next'
import { computed } from 'vue'
import { STEP_FORK_DEF } from '../../lib/pipeline/Step.ts'
import { useStepRegistry } from '../../lib/pipeline/StepRegistry.ts'
import type { AnyConfiguredStep } from '../../lib/pipeline/useStepHandler.ts'
import { useStepStore } from '../../lib/store/step-store.ts'

const store = useStepStore()

const {
  step,
  branchIndex,
} = defineProps<{
  step: AnyConfiguredStep,
  branchIndex: number,
}>()

const addableSteps = computed(() => useStepRegistry().getStepsCompatibleWithOutput(step.def))

function addAfter(def: string) {
  if (def === STEP_FORK_DEF) {
    store.addFork(STEP_FORK_DEF, 1, step.id)
  } else {
    store.addToBranch(step.id, branchIndex, def)
  }
}
</script>
<template>
  <BDropdown
    v-if="addableSteps.length"
    size="sm"
    no-caret
  >
    <template #button-content>
      <span class="material-symbols-outlined">add</span>
    </template>
    <BDropdownItem
      v-for="item in addableSteps"
      @click="addAfter(item.def)"
    >
      {{ item.displayName }}
    </BDropdownItem>

  </BDropdown>
</template>