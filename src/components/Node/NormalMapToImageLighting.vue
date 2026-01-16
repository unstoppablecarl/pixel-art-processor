<script lang="ts">
import { NormalMap } from '../../lib/node-data-types/NormalMap.ts'
import { PixelMap } from '../../lib/node-data-types/PixelMap.ts'
import { type NodeDef, NodeType } from '../../lib/pipeline/_types.ts'
import { defineStep } from '../../lib/pipeline/types/definitions.ts'

export const STEP_META = defineStep({
  type: NodeType.STEP,
  def: 'normal_map_to_texture_lighting' as NodeDef,
  displayName: 'NormalMap -> Texture Lighting',
  inputDataTypes: [NormalMap],
  outputDataType: PixelMap,
})
</script>
<script setup lang="ts">
import { computed } from 'vue'
import type { StepValidationError } from '../../lib/pipeline/errors/StepValidationError.ts'
import type { NodeId } from '../../lib/pipeline/_types.ts'
import { defineStepHandler, useStepHandler } from '../../lib/pipeline/NodeHandler/StepHandler.ts'
import {
  deserializeImageData,
  type SerializedImageData,
  serializeImageData,
} from '../../lib/util/html-dom/ImageData.ts'
import { imageDataRef } from '../../lib/util/vue-util.ts'
import NodeCard from '../Card/NodeCard.vue'
import ImageFileInput from '../UIForms/ImageFileInput.vue'
import RangeSlider from '../UIForms/RangeSlider.vue'

const { nodeId } = defineProps<{ nodeId: NodeId }>()
const textureImageData = imageDataRef()

const handler = defineStepHandler(STEP_META, {
  config() {
    return {
      lightX: 0.5,
      lightY: -0.5,
      lightZ: 1,
      textureImageData: null as null | SerializedImageData,
    }
  },
  serializeConfig: (config) => {
    return {
      ...config,
      textureImageData: serializeImageData(textureImageData.image.value),
    }
  },
  deserializeConfig(config) {
    textureImageData.image.value = deserializeImageData(config.textureImageData)

    return config
  },
  async run({ config, inputData }) {
    if (!inputData) return

    const imageData = textureImageData.image.value
    if (!imageData) return

    const result = inputData.applyLighting(
      imageData,
      config.lightX,
      config.lightY,
      config.lightZ,
    )

    return {
      output: result,
      preview: result.toImageData(),
    }
  },
})
const node = useStepHandler(nodeId, handler)

const images = computed(() => [
  {
    label: 'Texture',
    imageData: textureImageData.image.value,
  },
  {
    label: 'Output',
    imageData: node.outputPreview as ImageData | null,
    placeholderWidth: config.textureImageData?.width,
    placeholderHeight: config.textureImageData?.height,
  },
])
// onMounted(async () => {
//   await nextTick()
//   setTestFileInput(textureInputEl.value, TEST_TEXTURE_DATA)
// })
const config = node.config

function handleError(errors: StepValidationError[]) {
  node.validationErrors = errors
}
</script>
<template>
  <NodeCard
    :node="node"
    :images="images"
    :show-dimensions="true"
  >
    <template #footer>
      <div class="section">
        <ImageFileInput
          :image-data-ref="textureImageData"
          @error="handleError"
        />
      </div>

      <div class="section">
        <div class="section-heading">
          Light Direction
        </div>

        <RangeSlider
          :id="`${nodeId}-lightX`"
          label="X"
          :decimals="1"
          v-model:value="config.lightX"
          :min="-2"
          :max="2"
          :step="0.1"
        />


        <RangeSlider
          :id="`${nodeId}-lightY`"
          label="Y"
          :decimals="1"
          v-model:value="config.lightY"
          :min="-2"
          :max="2"
          :step="0.1"
        />

        <RangeSlider
          :id="`${nodeId}-lightZ`"
          label="Z"
          :decimals="1"
          v-model:value="config.lightZ"
          :min="-2"
          :max="2"
          :step="0.1"
        />
      </div>
    </template>
  </NodeCard>
</template>