<script setup lang="ts">
import { BDropdown, BDropdownItem } from 'bootstrap-vue-next'
import { computed } from 'vue'
import type { NodeDef, NodeId } from '../../lib/pipeline/Node.ts'
import { usePipelineStore } from '../../lib/store/pipeline-store.ts'

const store = usePipelineStore()

const {
  nodeId,
} = defineProps<{
  nodeId: NodeId,
}>()

const addableSteps = computed(() => store.getStepsAddableAfter(nodeId))

function addAfter(def: NodeDef) {
  store.add(def, nodeId)
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