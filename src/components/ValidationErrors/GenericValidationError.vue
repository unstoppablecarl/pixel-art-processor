<script setup lang="ts">

import type { StepValidationError } from '../../lib/errors.ts'

const { error } = defineProps<{
  error: StepValidationError
}>()
</script>
<template>
  <div class="text-danger fw-bold">{{ error.title }}</div>
  <div v-if="error.message" class="text-danger-emphasis">
    {{ error.message }}
  </div>
</template>