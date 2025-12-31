<script setup lang="ts">
import { computed } from 'vue'
import { useStepRegistry } from '../../lib/pipeline/StepRegistry.ts'
import { useStepStore } from '../../lib/store/step-store.ts'

const stepStore = useStepStore()
const stepRegistry = STEP_REGISTRY
const steps = computed(() => stepRegistry.rootSteps())

function add(def: string) {
  stepStore.add(def)
}
</script>
<template>
  <h5>Set Root Step</h5>
  <div v-for="step in steps" :key="step.def" class="pb-1">
    <button role="button" class="btn btn-secondary" @click="add(step.def)">{{ step.displayName }}</button>
  </div>
</template>
