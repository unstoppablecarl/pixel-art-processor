<script setup lang="ts">

import { computed } from 'vue'
import type { NodeId } from '../../lib/pipeline/_types.ts'
import { getNodeRegistry } from '../../lib/pipeline/NodeRegistry.ts'
import { usePipelineStore } from '../../lib/store/pipeline-store.ts'
import { getNodeDataTypeCssClass } from '../../nodes.ts'
import NodeDataTypePill from './NodeDataTypePill.vue'
import NodeDefinitionIO from './NodeDefinitionIO.vue'

const store = usePipelineStore()
const nodeRegistry = getNodeRegistry()

const {
  nodeId,
} = defineProps<{
  nodeId: NodeId,
}>()

const node = computed(() => store.get(nodeId))
const def = computed(() => nodeRegistry.get(node.value.def))
</script>
<template>
  <table class="table table-sm">
    <thead>
    <tr>
      <th colspan="2">ID: {{ node.id }}</th>
    </tr>
    <tr>
      <th colspan="2">DEF: {{ def.displayName }}</th>
    </tr>
    </thead>
    <tbody>
    <tr>
      <th class="text-nowrap">
        Definition I/O
      </th>
      <td>
        <NodeDefinitionIO :node-def="node.def" />
      </td>
    </tr>
    <tr>
      <th class="text-nowrap">
        Current I/O
      </th>
      <td>
        <div class="text-nowrap">

          <NodeDataTypePill
            v-for="item in node.handler!.currentInputDataTypes"
            :display-name="item.displayName"
            :css-color-class="getNodeDataTypeCssClass(item)"
          />

          &raquo;

          <NodeDataTypePill
            :display-name="node.handler!.currentOutputDataType.displayName"
            :css-color-class="getNodeDataTypeCssClass(node.handler!.currentOutputDataType)"
          />
        </div>
      </td>
    </tr>

    </tbody>
  </table>
</template>