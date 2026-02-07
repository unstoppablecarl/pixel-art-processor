<script setup lang="ts">
import { onUnmounted } from 'vue'
import Processor from './components/Processor.vue'
import DebugSidebar from './DebugSidebar.vue'
import { bindInputKeys } from './lib/key-bindings.ts'
import { useHistory } from './lib/util/history/history.ts'

const history = useHistory()
const unsub = bindInputKeys(history)

onUnmounted(() => {
  history.dispose()
  unsub()
})
</script>
<template>
  <Processor />
  <DebugSidebar />
</template>
<style lang="scss">
</style>