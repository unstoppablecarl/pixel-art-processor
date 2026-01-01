<script setup lang="ts">
import { BDropdown, BDropdownItem } from 'bootstrap-vue-next'
import { computed } from 'vue'
import type { AnyStepRef } from '../../lib/pipeline/Step.ts'
import { useStepRegistry } from '../../lib/pipeline/StepRegistry.ts'
import { usePipelineStore } from '../../lib/store/pipeline-store.ts'

const store = usePipelineStore()

const {
  step,
  branchIndex,
} = defineProps<{
  step: AnyStepRef,
  branchIndex: number,
}>()

const stepRegistry = STEP_REGISTRY
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