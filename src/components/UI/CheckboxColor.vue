<script setup lang="ts">
import {withDefaults} from 'vue'

const {
  label,
  color,
  bgColor,
} = withDefaults(defineProps<{
  label: string,
  color: string
  bgColor?: string,
}>(), {
  bgColor: 'rgba(255,255,255,1)',
})

const modelValue = defineModel()
</script>
<template>
  <div class="form-check">
    <input type="checkbox" class="form-check-input" name="generic"
           v-model="modelValue" />
    <label class="form-check-label">
      <span class="color-indicator" :style="`background: ${bgColor};`">
        <span :style="`background: ${color};`">&nbsp;</span> </span>
      {{ label }}
    </label>
  </div>
</template>
