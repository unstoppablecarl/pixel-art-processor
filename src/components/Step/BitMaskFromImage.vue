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
import type { StepValidationError } from '../../lib/pipeline/errors/StepValidationError.ts'
import type { NodeId } from '../../lib/pipeline/_types.ts'
import { useStepHandler } from '../../lib/pipeline/useStepHandler.ts'
import { deserializeImageData, serializeImageData } from '../../lib/util/ImageData.ts'
import StepCard from '../StepCard.vue'
import ImageFileInput from '../UIForms/ImageFileInput.vue'

const { nodeId } = defineProps<{ nodeId: NodeId }>()

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

function handleError(errors: StepValidationError[]) {
  node.validationErrors = errors
}
</script>
<template>
  <StepCard
    :node="node"
    :images="[{
      label: 'BitMaskFromImage Input',
      imageData: node.config.maskImageData,
    }]"
    show-dimensions
  >
    <template #footer>
      <div class="section">
        <ImageFileInput
          v-model="node.config.maskImageData"
          @error="handleError"
        />
      </div>
    </template>
  </StepCard>
</template>