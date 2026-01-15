<script setup lang="ts">

import { BTab, BTabs } from 'bootstrap-vue-next'
import type { NodeId } from '../../lib/pipeline/_types.ts'
import NodeFooterBtnCollapse from './NodeFooterBtnCollapse.vue'

const activeTabIndex = defineModel<number>('activeTabIndex', { required: true })
const { nodeId } = defineProps<{ nodeId: NodeId }>()

</script>
<template>
  <BTabs
    v-model:index="activeTabIndex"
    no-body
  >
    <BTab
      :id="`${nodeId}-settings`"
      title="Settings"
    />

    <BTab
      :id="`${nodeId}-display-options`"
      title="Display"
    />

    <NodeFooterBtnCollapse :node-id="nodeId" v-model:active-tab-index="activeTabIndex" />
  </BTabs>

  <div class="auto-animate" v-auto-animate>
    <div class="tabs-settings-body-content" v-if="activeTabIndex === 0">
      <slot name="settings"></slot>
    </div>
    <div class="tabs-settings-body-content" v-if="activeTabIndex === 1">
      <slot name="display-options"></slot>
    </div>
  </div>
</template>
<style scoped lang="scss">
</style>