<script setup lang="ts">
import { computed } from 'vue'
import { STEP_FORK_DEF } from '../../lib/pipeline/Step.ts'
import { useStepRegistry } from '../../lib/pipeline/StepRegistry.ts'
import { useStepStore } from '../../lib/store/step-store.ts'

const stepStore = useStepStore()
const steps = computed(() => useStepRegistry().toArray().filter(s => s.def !== STEP_FORK_DEF))

function add(def: string) {
  stepStore.add(def)
}

function addFork() {
  stepStore.addFork()
}
</script>
<template>
  <h5>Add Step</h5>
  <div v-for="step in steps" :key="step.def" class="pb-1">
    <button role="button" class="btn btn-secondary" @click="add(step.def)">{{ step.displayName }}</button>
  </div>
  <button role="button" class="btn btn-secondary" @click="addFork()">Fork</button>
</template>
