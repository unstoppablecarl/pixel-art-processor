<script lang="ts">
import { type AnyStepMeta, NodeType } from '../../lib/pipeline/_types.ts'
import { BitMask } from '../../lib/step-data-types/BitMask.ts'

export const STEP_META: AnyStepMeta = {
  type: NodeType.STEP,
  def: 'bitmask_from_image',
  displayName: 'BitMask: Image',
  inputDataTypes: [],
  outputDataType: BitMask,
}

</script>
<script setup lang="ts">
import { ref } from 'vue'
import { handleStepValidationError } from '../../lib/errors.ts'
import type { NodeId } from '../../lib/pipeline/_types.ts'
import { useStepHandler } from '../../lib/pipeline/useStepHandler.ts'
import { arrayBufferToImageData, getFileAsArrayBuffer } from '../../lib/util/file-upload.ts'
import { deserializeImageData, serializeImageData } from '../../lib/util/ImageData.ts'
import StepCard from '../StepCard.vue'

const { nodeId } = defineProps<{ nodeId: NodeId }>()
const maskInputEl = ref<HTMLInputElement | null>(null)

const node = useStepHandler(nodeId, {
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
  async run({ config }) {
    if (!config.maskImageData) return

    const bitMask = BitMask.fromImageData(config.maskImageData)

    return {
      preview: config.maskImageData,
      output: bitMask,
    }
  },
})
const handleFileUpload = (event: Event) => {
  getFileAsArrayBuffer(event)
    .then(arrayBufferToImageData)
    .then((imageData) => {
      node.config.maskImageData = imageData
    })
    .catch(error => {
      node.validationErrors = handleStepValidationError(nodeId, error)
    })
}
</script>
<template>
  <StepCard
    :node="node"
    :images="[{
      label: 'BitMaskFromImage Input',
      imageData: node.config.maskImageData
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