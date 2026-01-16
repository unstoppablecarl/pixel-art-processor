<script setup lang="ts">
import { BPopover } from 'bootstrap-vue-next'
import type { NodeId } from '../../lib/pipeline/_types.ts'
import NodeInfoContent from './NodeInfoContent.vue'

const {
  nodeId,
} = defineProps<{
  nodeId: NodeId,
}>()

</script>
<template>
  <BPopover>
    <template #target>
      <span class="btn btn-sm btn-transparent btn-node-info" v-bind="$attrs">?</span>
    </template>
    <NodeInfoContent :node-id="nodeId" />
  </BPopover>
</template>
<style lang="scss">
.btn-node-info {
  --bs-btn-color: #{rgba($info, 0.6)};
  --bs-btn-border-color: #{rgba($info, 0.15)};

  --bs-btn-hover-color: #{rgba($info, 1)};
  --bs-btn-hover-border-color: #{rgba($info, 0.5)};
}
</style>