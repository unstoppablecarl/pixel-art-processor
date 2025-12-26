<script setup lang="ts">

const {
  id,
  label,
  step = 1,
  min = 0,
  max,
  inputWidth,
} = defineProps<{
  id: string,
  label: string,
  step: number,
  min: number,
  max?: number,
  inputWidth?: string,
}>()

const modelValue = defineModel<number>()

</script>
<template>
  <div class="hstack">
    <label class="form-label col-form-label col-4 text-end pe-2 me-auto" :for="id">{{ label }}</label>
    <input
      :id="id"
      class="form-control form-control-sm"
      type="number"
      :step="step"
      :min="min"
      :max="max"
      v-model="modelValue"
      :style="inputWidth ? `width: ${inputWidth}` : ''"
    />
  </div>
</template>