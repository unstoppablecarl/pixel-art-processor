<script setup lang="ts">
import { toRaw, toValue } from 'vue'

const { options } = defineProps<{
  options: Record<string, string>;
}>()
console.log('opt', toValue(toRaw(options)))
const selectedValue = defineModel<string>()
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
