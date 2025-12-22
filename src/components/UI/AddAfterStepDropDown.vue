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
} = defineProps<{
  step: AnyConfiguredStep,
}>()

const addableSteps = computed(() => useStepRegistry().getStepsCompatibleWithOutput(step.def))

function addAfter(def: string) {
  if (step.def === STEP_FORK_DEF) {
    store.addFork(STEP_FORK_DEF, 2, step.id)
  }
  store.add(def, step.id)
}
</script>
<template>
  <BDropdown
    v-if="addableSteps.length"
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