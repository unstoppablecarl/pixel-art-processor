<script setup lang="ts">
import { InvalidInputStaticTypeError } from '../../lib/pipeline/errors/InvalidInputStaticTypeError.ts'
import { getNodeRegistry } from '../../lib/pipeline/NodeRegistry.ts'

const { error } = defineProps<{
  error: InvalidInputStaticTypeError,
}>()

const dataTypeRegistry = getNodeRegistry().dataTypeRegistry

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