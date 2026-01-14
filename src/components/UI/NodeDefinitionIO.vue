<script setup lang="ts">
import { computed } from 'vue'
import type { NodeDef } from '../../lib/pipeline/_types.ts'
import { getNodeRegistry } from '../../lib/pipeline/NodeRegistry.ts'
import NodeDataTypePill from './NodeDataTypePill.vue'

const nodeRegistry = getNodeRegistry()

const {
  nodeDef,
  showTypeDisplayName = true,
} = defineProps<{
  nodeDef: NodeDef,
  showTypeDisplayName?: boolean
}>()

const info = computed(() => nodeRegistry.getColorInfo(nodeDef))
</script>
<template>
  <div class="text-nowrap">
    <NodeDataTypePill
      v-for="item in info.inputDataTypes"
      :display-name="item.displayName"
      :css-color-class="item.cssClass"
      :show-type-display-name="showTypeDisplayName"
    />

    &raquo;

    <NodeDataTypePill
      :display-name="info.outputDataType.displayName"
      :css-color-class="info.outputDataType.cssClass"
      :show-type-display-name="showTypeDisplayName"
    />
  </div>
</template>