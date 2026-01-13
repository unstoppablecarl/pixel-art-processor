<script setup lang="ts">
import { computed } from 'vue'
import { type NodeDef, type NodeId } from '../../lib/pipeline/_types.ts'
import { getNodeRegistry } from '../../lib/pipeline/NodeRegistry.ts'

const nodeRegistry = getNodeRegistry()
const {
  nodeId,
  nodeDef,
} = defineProps<{
  nodeId: NodeId,
  nodeDef: NodeDef,
}>()

const definition = computed(() => nodeRegistry.get(nodeDef))
const component = computed(() => nodeRegistry.defToComponent(nodeDef))
</script>
<template>
  <template v-if="definition.render !== false">
    <component
      :is="component"
      :node-id="nodeId"
    />
  </template>
</template>
