<script setup lang="ts">

const model = defineModel()
const {
  id,
  label,
} = defineProps<{
  id: string,
  label: string,
}>()
</script>
<template>
  <div class="form-check form-check-item">
    <input class="form-check-input" type="checkbox" :id="id" v-model="model" />
    <label class="form-check-label" :for="id">
      {{ label }}
    </label>
  </div>
</template>
