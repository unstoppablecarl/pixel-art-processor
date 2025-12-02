<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useStepRegistry } from '../../lib/pipeline/StepRegistry.ts'
import { useStepStore } from '../../lib/store/step-store.ts'

const stepStore = useStepStore()
const steps = computed(() => useStepRegistry().toArray())

const selected = ref('none')

watch(selected, async () => {
  if (selected.value === 'none') {
    return
  }
  add(selected.value)
  await nextTick()
  selected.value = 'none'
})

function add(def: string) {
  stepStore.add(def)
}
</script>
<template>
  <h5>Add Step</h5>
  <div v-for="step in steps" :key="step.def" class="pb-1">
    <button role="button" class="btn btn-secondary" @click="add(step.def)">{{ step.displayName }}</button>
  </div>
</template>
