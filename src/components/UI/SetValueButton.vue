<script setup lang="ts">
import { computed } from 'vue'

const model = defineModel({ required: true })

const {
  label,
  value,
  icon,
} = defineProps<{
  label: string,
  value: string | number,
  icon: string,
}>()
const selected = computed(() => model.value == value)
</script>
<template>
  <button
    @click="model = value"
    :class="{
            'btn btn-sm': true,
            'btn-primary': selected,
            'btn-outline-primary': !selected,
          }"
    :title="label"
  >
    <span class="material-symbols-outlined">{{ icon }}</span>
  </button>
</template>
<style scoped lang="scss">

</style>