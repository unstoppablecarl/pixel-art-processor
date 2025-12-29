<script lang="ts">
import { StepType } from '../../lib/pipeline/Step.ts'
import type { StepMeta } from '../../lib/pipeline/StepMeta.ts'

export const STEP_META: StepMeta = {
  type: StepType.NORMAL,
  def: 'bitmask_from_image',
  displayName: 'BitMask: Image',
  inputDataTypes: [],
  outputDataType: BitMask,
}

</script>
<script setup lang="ts">
import { ref } from 'vue'
import { useStepHandler } from '../../lib/pipeline/useStepHandler.ts'
import { BitMask } from '../../lib/step-data-types/BitMask.ts'
import { useStepStore } from '../../lib/store/step-store.ts'
import { arrayBufferToImageData, getFileAsArrayBuffer } from '../../lib/util/file-upload.ts'
import { deserializeImageData, serializeImageData } from '../../lib/util/ImageData.ts'
import StepCard from '../StepCard.vue'

const store = useStepStore()
const { stepId } = defineProps<{ stepId: string }>()
const maskInputEl = ref<HTMLInputElement | null>(null)

const handleFileUpload = (event: Event) => {
  getFileAsArrayBuffer(event)
    .then(arrayBufferToImageData)
    .then((imageData) => {
      step.config.maskImageData = imageData
    })
    .catch(error => store.handleStepError(stepId, error))
}

const step = useStepHandler(stepId, {
  ...STEP_META,
  config() {
    return {
      maskImageData: null as null | ImageData,
    }
  },
  serializeConfig(config) {
    return {
      ...config,
      maskImageData: serializeImageData(config.maskImageData),
    }
  },
  deserializeConfig(config) {
    return {
      ...config,
      maskImageData: deserializeImageData(config.maskImageData),
    }
  },
  run({ config }) {
    if (!config.maskImageData) return

    const bitMask = BitMask.fromImageData(config.maskImageData)

    return {
      preview: config.maskImageData,
      output: bitMask,
    }
  },
  // never accept input
  prevOutputToInput(_input) {
    return null
  },
})
</script>
<template>
  <StepCard
    :step="step"
    :images="[{
      label: 'BitMaskFromImage Input',
      imageData: step.config.maskImageData
    }]"
    show-dimensions
  >
    <template #footer>
      <div class="section">
        <input ref="maskInputEl" type="file" accept="image/*" @change="handleFileUpload" class="form-control" />
      </div>
    </template>
  </StepCard>
</template>