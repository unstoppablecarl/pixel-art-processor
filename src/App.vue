<script setup lang="ts">
import { BApp } from 'bootstrap-vue-next'
import Processor from './components/Processor.vue'
import DebugSidebar from './DebugSidebar.vue'

const appDefaults = {
  BPopover: {
    delay: { show: 0, hide: 0 },
  },
}
</script>
<template>
  <BApp :defaults="appDefaults">
    <Processor />
    <DebugSidebar />
  </BApp>
</template>