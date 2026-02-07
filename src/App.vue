<script setup lang="ts">
import { BApp } from 'bootstrap-vue-next'
import AppRoot from './AppRoot.vue'

const appDefaults = {
  BPopover: {
    delay: { show: 0, hide: 0 },
    noFade: true,
  },
}
</script>
<template>
  <BApp :defaults="appDefaults">
    <AppRoot />
  </BApp>
</template>