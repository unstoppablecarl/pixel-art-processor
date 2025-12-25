<script setup lang="ts">
const {
  label,
  value,
} = defineProps<{
  label: string,
  value: number | string,
}>()

</script>
<template>
  <span class="range-label">
    <span class="fw-medium me-1">
      {{ label }}
    </span>
    <span class="text-muted">
      {{ value }}
    </span>
  </span>
</template>