<script lang="ts">
import { BitMask } from '../../lib/node-data-types/BitMask.ts'
import { type NodeDef, NodeType } from '../../lib/pipeline/_types.ts'
import { defineStep } from '../../lib/pipeline/types/definitions.ts'

export const STEP_META = defineStep({
  type: NodeType.STEP,
  def: 'bitmask_from_image' as NodeDef,
  displayName: 'BitMask: Image',
  noInput: true,
  outputDataType: BitMask,
})
</script>
<script setup lang="ts">
import type { StepValidationError } from '../../lib/pipeline/errors/StepValidationError.ts'
import type { NodeId, WatcherTarget } from '../../lib/pipeline/_types.ts'
import { defineStepHandler, useStepHandler } from '../../lib/pipeline/NodeHandler/StepHandler.ts'
import {
  deserializeImageData,
  type SerializedImageData,
  serializeImageData,
} from '../../lib/util/html-dom/ImageData.ts'
import { imageDataRef } from '../../lib/util/vue-util.ts'
import NodeCard from '../Card/NodeCard.vue'
import ImageFileInput from '../UIForms/ImageFileInput.vue'

const { nodeId } = defineProps<{ nodeId: NodeId }>()

const maskImageData = imageDataRef()

const handler = defineStepHandler(STEP_META, {
  config() {
    return {
      maskImageData: null as (SerializedImageData | null),
    }
  },
  serializeConfig: (config) => {
    return {
      ...config,
      maskImageData: serializeImageData(maskImageData.image.value),
    }
  },
  deserializeConfig(config) {
    maskImageData.image.value = deserializeImageData(config.maskImageData)

    return config
  },
  watcherTargets(_node, defaultWatcherTargets: WatcherTarget[]): WatcherTarget[] {
    return [...defaultWatcherTargets, {
      name: 'maskImageData',
      target: maskImageData.image,
    }]
  },
  async run() {
    const imageData = maskImageData.image.value
    if (imageData === null) return

    const bitMask = BitMask.fromImageData(imageData)

    return {
      preview: imageData,
      output: bitMask,
    }
  },
})

const node = useStepHandler(nodeId, handler)

function handleError(errors: StepValidationError[]) {
  node.validationErrors = errors
}
</script>
<template>
  <NodeCard
    :node="node"
    :images="[{
      label: 'BitMaskFromImage Input',
      imageData: maskImageData.image.value,
    }]"
    show-dimensions
  >
    <template #footer>
      <div class="section">
        <ImageFileInput
          :image-data-ref="maskImageData"
          @error="handleError"
        />
      </div>
    </template>
  </NodeCard>
</template>