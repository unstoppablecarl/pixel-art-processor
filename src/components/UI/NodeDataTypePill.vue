<script setup lang="ts">
const {
  displayName,
  cssColorClass,
  showTypeDisplayName = true,
} = defineProps<{
  displayName: string,
  cssColorClass: string,
  showTypeDisplayName?: boolean,
}>()

</script>
<template>
  <span :class="'badge rounded-pill badge-node-data-type ' + cssColorClass">
    <template v-if="showTypeDisplayName">
      {{ displayName }}
    </template>
    <template v-else>
      &bull;
    </template>
  </span>
</template>
<style lang="scss">
.badge-node-data-type {
  font-size: .75rem;
}
</style>
