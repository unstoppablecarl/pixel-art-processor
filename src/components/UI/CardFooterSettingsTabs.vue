<script setup lang="ts">

import { BTab, BTabs } from 'bootstrap-vue-next'
import { computed } from 'vue'
import type { NodeId } from '../../lib/pipeline/_types.ts'
import NodeFooterBtnCollapse from './NodeFooterBtnCollapse.vue'

const activeTabIndex = defineModel<number>('activeTabIndex', { required: true })
const {
  nodeId,
  extraTabLabel = '',
} = defineProps<{
  nodeId: NodeId,
  extraTabLabel?: string
}>()

const displayTabIndex = computed(() => extraTabLabel ? 2 : 1)

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
      v-if="extraTabLabel"
      :id="`${nodeId}-${extraTabLabel}`"
      :title="extraTabLabel"
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

    <div class="tabs-settings-body-content" v-if="extraTabLabel && activeTabIndex === 1">
      <slot name="extra"></slot>
    </div>

    <div class="tabs-settings-body-content" v-if="activeTabIndex === displayTabIndex">
      <slot name="display-options"></slot>
    </div>

  </div>
</template>
<style scoped lang="scss">
</style>