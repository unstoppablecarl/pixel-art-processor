<script setup lang="ts">
import { BDropdown, BDropdownItem } from 'bootstrap-vue-next'
import { computed } from 'vue'
import { usePipelineStore } from '../../lib/store/pipeline-store.ts'

const store = usePipelineStore()

const {
  stepId,
} = defineProps<{
  stepId: string,
}>()

const addableSteps = computed(() => store.getStepsAddableAfter(stepId))

function addAfter(def: string) {
  store.add(def, stepId)
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