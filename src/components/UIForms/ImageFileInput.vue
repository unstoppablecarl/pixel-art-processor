<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { handleStepValidationError } from '../../lib/pipeline/errors/errors.ts'
import type { StepValidationError } from '../../lib/pipeline/errors/StepValidationError.ts'
import { arrayBufferToImageData, getFileAsArrayBuffer } from '../../lib/util/file-upload.ts'

type Emits = {
  (e: 'error', errors: StepValidationError[]): void;
}

const model = defineModel<ImageData | null>()
const emit = defineEmits<Emits>()
const fileInputEl = useTemplateRef('fileInputEl')

const handleFileUpload = (event: Event) => {
  getFileAsArrayBuffer(event)
    .then(arrayBufferToImageData)
    .then((imageData) => {
      (fileInputEl.value as HTMLInputElement).value = ''
      model.value = imageData
    })
    .catch(error => {
      emit('error', [handleStepValidationError(error)])
    })
}

function clear() {
  model.value = null
}
</script>
<template>
  <div v-if="!model">
    <input ref="fileInputEl" type="file" accept="image/*" @change="handleFileUpload" class="form-control" />
  </div>
  <div v-else>
    <button role="button" class="btn btn-outline-danger" type="button" @click="clear">Clear Image</button>
  </div>
</template>