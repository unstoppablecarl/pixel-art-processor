<script setup lang="ts">
import { computed } from 'vue'
import type { NodeDef } from '../../lib/pipeline/Node.ts'
import { usePipelineStore } from '../../lib/store/pipeline-store.ts'
import { STEP_REGISTRY } from '../../steps.ts'

const store = usePipelineStore()
const stepRegistry = STEP_REGISTRY
const steps = computed(() => stepRegistry.rootSteps())

function add(def: NodeDef) {
  store.add(def)
}
</script>
<template>
  <h5>Set Root Step</h5>
  <div v-for="node in steps" :key="node.def" class="pb-1">
    <button role="button" class="btn btn-secondary" @click="add(node.def)">{{ node.displayName }}</button>
  </div>
</template>
