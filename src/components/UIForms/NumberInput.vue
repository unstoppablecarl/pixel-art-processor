<script setup lang="ts">

const {
  id,
  label,
  step = 1,
  min = 0,
  max = Infinity,
  disabled = false,
  inputWidth = '',
} = defineProps<{
  id: string,
  label: string,
  step?: number,
  min?: number,
  max?: number,
  inputWidth?: string,
  disabled?: boolean,
}>()

const modelValue = defineModel<number>({ required: true })

</script>
<template>
  <div class="hstack">
    <label class="form-label col-form-label text-end pe-2 me-auto" :for="id">{{ label }}</label>
    <input
      :id="id"
      class="form-control form-control-sm"
      type="number"
      :step="step"
      :min="min"
      :max="max"
      :disabled="disabled"
      v-model="modelValue"
      :style="inputWidth ? `width: ${inputWidth}` : ''"
    />
  </div>
</template>