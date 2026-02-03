<script setup lang="ts" generic="T">
import { computed } from 'vue'

const model = defineModel({ required: true })

const {
  label,
  value,
  icon,
  selected = null,
} = defineProps<{
  label: string,
  value: T,
  icon: string,
  selected?: boolean,
}>()
const isSelected = computed(() => selected ?? model.value == value)
</script>
<template>
  <button
    @click="model = value"
    :class="{
            'btn btn-sm': true,
            'btn-primary': isSelected,
            'btn-outline-primary': !isSelected,
          }"
    :title="label"
  >
    <span class="material-symbols-outlined">{{ icon }}</span>
  </button>
</template>
<style scoped lang="scss">

</style>