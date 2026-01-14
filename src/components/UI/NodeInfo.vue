<script setup lang="ts">
import { BPopover } from 'bootstrap-vue-next'
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
  <template v-if="node && def">
    <BPopover>
      <template #target>
        <span class="btn btn-sm btn-transparent btn-node-info" v-bind="$attrs">?</span>
      </template>

      <table class="table table-sm">
        <thead>
        <tr>
          <th colspan="2"> {{ def.displayName }}</th>
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
    </BPopover>

  </template>
</template>
<style lang="scss">
.btn-node-info {
  --bs-btn-color: #{rgba($info, 0.6)};
  --bs-btn-border-color: #{rgba($info, 0.15)};

  --bs-btn-hover-color: #{rgba($info, 1)};
  --bs-btn-hover-border-color: #{rgba($info, 0.5)};
}
</style>