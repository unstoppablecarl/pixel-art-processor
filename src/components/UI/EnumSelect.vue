<script setup lang="ts">
const { options } = defineProps<{
  options: Record<string | number, string>;
}>()
const selectedValue = defineModel<string | number>()
</script>
<template>
  <select
    v-model="selectedValue"
    class="form-select"
  >
    <option
      v-for="(optionValue, key) in options"
      :key="key"
      :value="key"
      :selected="optionValue === selectedValue"
    >
      {{ optionValue }}
    </option>
  </select>
</template>
