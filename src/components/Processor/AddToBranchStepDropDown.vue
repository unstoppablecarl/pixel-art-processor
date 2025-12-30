<script setup lang="ts">
import { BDropdown, BDropdownItem } from 'bootstrap-vue-next'
import { computed } from 'vue'
import type { AnyConfiguredStep } from '../../lib/pipeline/Step.ts'
import { useStepRegistry } from '../../lib/pipeline/StepRegistry.ts'
import { useStepStore } from '../../lib/store/step-store.ts'

const store = useStepStore()

const {
  step,
  branchIndex,
} = defineProps<{
  step: AnyConfiguredStep,
  branchIndex: number,
}>()

const stepRegistry = useStepRegistry()
const addableSteps = computed(() => stepRegistry.getStepsCompatibleWithOutput(step.def))

function addAfter(def: string) {
  store.addToBranch(step.id, branchIndex, def)
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