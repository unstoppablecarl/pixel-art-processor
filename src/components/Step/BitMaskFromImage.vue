<script lang="ts">
import { NodeType } from '../../lib/pipeline/_types.ts'
import { defineStep } from '../../lib/pipeline/types/definitions.ts'
import { BitMask } from '../../lib/node-data-types/BitMask.ts'

export const STEP_META = defineStep({
  type: NodeType.STEP,
  def: 'bitmask_from_image',
  displayName: 'BitMask: Image',
  inputDataTypes: [],
  outputDataType: BitMask,
})
</script>
<script setup lang="ts">
import type { StepValidationError } from '../../lib/pipeline/errors/StepValidationError.ts'
import type { NodeId } from '../../lib/pipeline/_types.ts'
import { defineStepHandler } from '../../lib/pipeline/NodeHandler/StepHandler.ts'
import { useStepHandler } from '../../lib/pipeline/NodeHandler/useHandlers.ts'
import { deserializeImageData, serializeImageData } from '../../lib/util/ImageData.ts'
import StepCard from '../Card/StepCard.vue'
import ImageFileInput from '../UIForms/ImageFileInput.vue'

const { nodeId } = defineProps<{ nodeId: NodeId }>()

const handler = defineStepHandler(STEP_META, {
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

const node = useStepHandler(nodeId, STEP_META, handler)

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