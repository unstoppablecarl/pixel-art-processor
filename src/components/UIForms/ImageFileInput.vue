<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { handleStepValidationError } from '../../lib/pipeline/errors/errors.ts'
import type { StepValidationError } from '../../lib/pipeline/errors/StepValidationError.ts'
import { arrayBufferToImageData, getFileAsArrayBuffer } from '../../lib/util/html-dom/file-upload.ts'
import type { ImageDataRef } from '../../lib/vue/vue-image-data.ts'

type Emits = {
  (e: 'imageDataLoaded', imageData: ImageData): void;
  (e: 'error', errors: StepValidationError[]): void;
}

const emit = defineEmits<Emits>()
const fileInputEl = useTemplateRef('fileInputEl')

const {
  imageDataRef,
} = defineProps<{
  imageDataRef: ImageDataRef,
}>()

const handleFileUpload = (event: Event) => {
  getFileAsArrayBuffer(event)
    .then(arrayBufferToImageData)
    .then((imageData) => {
      (fileInputEl.value as HTMLInputElement).value = ''
      imageDataRef.set(imageData)
    })
    .catch(error => {
      emit('error', [handleStepValidationError(error)])
    })
}

function clear() {
  imageDataRef.clear()
}
</script>
<template>
  <div v-if="!imageDataRef.hasValue">
    <input ref="fileInputEl" type="file" accept="image/*" @change="handleFileUpload" class="form-control" />
  </div>
  <div v-else>
    <button role="button" class="btn btn-outline-danger" type="button" @click="clear">Clear Image</button>
  </div>
</template>