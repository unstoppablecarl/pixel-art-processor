<script setup lang="ts">

import { BPopover } from 'bootstrap-vue-next'
import { computed } from 'vue'
import type { NodeId } from '../../lib/pipeline/_types.ts'
import { getNodeRegistry } from '../../lib/pipeline/NodeRegistry.ts'
import { usePipelineStore } from '../../lib/store/pipeline-store.ts'

const store = usePipelineStore()
const nodeRegistry = getNodeRegistry()

const {
  nodeId,
} = defineProps<{
  nodeId: NodeId,
}>()

const node = computed(() => store.maybeGet(nodeId))
</script>
<template>
  <template v-if="node">
    <BPopover>
      <template #target>
        <span class="btn btn-sm btn-transparent btn-node-info" style="opacity: 0.66">?</span>
      </template>

      <div>
        <strong>Input:</strong>
        {{ node.handler?.currentInputDataTypes?.map((t: any) => t.displayName).join(', ') }}
      </div>
      <div>
        <strong>Output:</strong>
        {{ node.handler?.currentOutputDataType?.displayName }}
      </div>
    </BPopover>

  </template>
</template>
<style lang="scss">
.btn-node-info {
  --bs-btn-color: #{rgba($info, 0.9)};
  --bs-btn-border-color: #{rgba($info, 0.2)};

  --bs-btn-hover-color: #{rgba($info, 1)};
  --bs-btn-hover-border-color: #{rgba($info, 0.5)};
}
</style>