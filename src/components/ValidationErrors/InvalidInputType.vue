<script setup lang="ts">

import type { InvalidInputTypeError } from '../../lib/errors.ts'
import { useStepRegistry } from '../../lib/pipeline/StepRegistry.ts'

const { error } = defineProps<{
  error: InvalidInputTypeError,
}>()

const dataTypeRegistry = useStepRegistry().dataTypeRegistry

const valid = error.expectedTypes.map(t => {
  return dataTypeRegistry.getDisplayName(t)
})

const provided = dataTypeRegistry.getDisplayName(error.receivedType)

</script>
<template>
  <div class="text-danger fw-bold">{{ error.title }}</div>
  <div class="text-danger-emphasis">
    <span class="fw-medium">Valid:</span> {{ valid.join(', ') }}
  </div>
  <div class="text-danger-emphasis">
    <span class="fw-medium">Provided:</span> {{ provided }}
  </div>
</template>