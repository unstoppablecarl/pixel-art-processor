<script setup lang="ts">
import { BTab } from 'bootstrap-vue-next'
import { ref } from 'vue'
import type { NodeId } from '../../lib/pipeline/_types.ts'

const activeTabIndex = defineModel('activeTabIndex', { required: true })
const { nodeId } = defineProps<{ nodeId: NodeId }>()

const settingsVisible = ref(true)

function toggleExpand() {
  if (!settingsVisible.value) {
    activeTabIndex.value = 0
  }
  settingsVisible.value = !settingsVisible.value
}
</script>
<template>
  <BTab
    :id="`${nodeId}-show-hide-settings`"
    title-link-class="nav-link-collapse"
    title-item-class="ms-auto"
    @click="toggleExpand()"
  >
    <template #title>
      &nbsp;
    </template>
  </BTab>
</template>
<style scoped lang="scss">
</style>