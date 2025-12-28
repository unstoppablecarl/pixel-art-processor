<script setup lang="ts">
import { BDropdown, BDropdownItem } from 'bootstrap-vue-next'
import { computed } from 'vue'
import { useStepRegistry } from '../../lib/pipeline/StepRegistry.ts'
import { useStepStore } from '../../lib/store/step-store.ts'

const store = useStepStore()

const {
  stepId,
} = defineProps<{
  stepId: string,
}>()

const addableSteps = computed(() => store.getStepsAddableAfter(stepId))
const stepRegistry = useStepRegistry()

function addAfter(def: string) {
  if (stepRegistry.isFork(def)) {
    store.addFork(def)
  } else {
    store.add(def, stepId)
  }
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