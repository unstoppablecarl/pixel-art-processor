<script setup lang="ts">
import { computed } from 'vue'

const {
  timeMs,
  label = '',
} = defineProps<{
  timeMs: number | undefined,
  label?: string,
}>()

const executionTime = computed(() => {
  if (!timeMs) return
  return (timeMs / 1000).toFixed(2)
})
</script>
<template>
  <div class="execution-time" v-if="executionTime">
    <span class="material-symbols-outlined">timer</span>
    {{ executionTime }}s
    {{ label }}
  </div>
</template>
<style lang="scss">
.execution-time {
  font-size: 0.875em;
  opacity: 0.6;
}
</style>