<script setup lang="ts">
import { BDropdown, BDropdownItem } from 'bootstrap-vue-next'
import { computed } from 'vue'
import type { NodeDef, NodeId } from '../../lib/pipeline/Node.ts'
import { useStepRegistry } from '../../lib/pipeline/StepRegistry.ts'
import { usePipelineStore } from '../../lib/store/pipeline-store.ts'

const store = usePipelineStore()

const {
  branchNodeId,
} = defineProps<{
  branchNodeId: NodeId,
}>()

const stepRegistry = useStepRegistry()
const node = computed(() => store.get(branchNodeId))
const addableSteps = computed(() => stepRegistry.getStepsCompatibleWithOutput(node.value.def))

function addAfter(def: NodeDef) {
  store.add(def, node.value.id)
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