<script setup lang="ts">

const {
  id,
  label,
  step = 1,
  min = 0,
  max,
} = defineProps<{
  id: string,
  label: string,
  step: number,
  min: number,
  max?: number,
}>()

const modelValue = defineModel<number>()

</script>
<template>
  <div class="row gx-0">
    <div class="col-6">
      <label class="form-label col-form-label col-4 text-end pe-2" :for="id">{{ label }}</label>
    </div>
    <div class="col-6">
      <input
        :id="id"
        class="form-control form-control-sm"
        type="number"
        :step="step"
        :min="min"
        :max="max"
        v-model="modelValue"
      />
    </div>
  </div>
</template>