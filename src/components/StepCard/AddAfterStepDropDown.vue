<script setup lang="ts">
import { BDropdown, BDropdownItem } from 'bootstrap-vue-next'
import { computed } from 'vue'
import { STEP_FORK_DEF } from '../../lib/pipeline/Step.ts'
import { useStepStore } from '../../lib/store/step-store.ts'

const store = useStepStore()

const {
  stepId,
} = defineProps<{
  stepId: string,
}>()

const addableSteps = computed(() => store.getStepsAddableAfter(stepId))

function addAfter(def: string) {
  if (def === STEP_FORK_DEF) {
    store.addFork(stepId)
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