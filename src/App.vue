<script setup lang="ts">
import { BApp } from 'bootstrap-vue-next'
import Processor from './components/Processor.vue'
import DebugSidebar from './DebugSidebar.vue'
import './lib/key-bindings.ts'

const appDefaults = {
  BPopover: {
    delay: { show: 0, hide: 0 },
    noFade: true
  },
}
</script>
<template>
  <BApp :defaults="appDefaults">
    <Processor />
    <DebugSidebar />
  </BApp>
</template>