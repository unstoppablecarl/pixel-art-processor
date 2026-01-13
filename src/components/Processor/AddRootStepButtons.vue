<script setup lang="ts">
import { computed } from 'vue'
import type { NodeDef } from '../../lib/pipeline/_types.ts'
import { getNodeRegistry } from '../../lib/pipeline/NodeRegistry.ts'
import { usePipelineStore } from '../../lib/store/pipeline-store.ts'

const store = usePipelineStore()
const stepRegistry = getNodeRegistry()
const steps = computed(() => stepRegistry.rootNodes())

function add(def: NodeDef) {
  store.add(def, null)
}
</script>
<template>
  <h5>Set Root Step</h5>
  <div v-for="node in steps" :key="node.def" class="pb-1">
    <button role="button" class="btn btn-secondary" @click="add(node.def)">{{ node.displayName }}</button>
  </div>
</template>
