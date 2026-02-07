<script setup lang="ts">
import { BApp } from 'bootstrap-vue-next'
import Root from './Root.vue'

const appDefaults = {
  BPopover: {
    delay: { show: 0, hide: 0 },
    noFade: true,
  },
}
</script>
<template>
  <BApp :defaults="appDefaults">
    <Root />
  </BApp>
</template>