<script lang="ts">
import { BitMask } from '../../lib/node-data-types/BitMask.ts'
import { type NodeDef, NodeType } from '../../lib/pipeline/_types.ts'
import { defineStep } from '../../lib/pipeline/types/definitions.ts'

export const STEP_META = defineStep({
  type: NodeType.STEP,
  def: 'draw_image' as NodeDef,
  displayName: 'BitMask: Draw Image',
  noInput: true,
  outputDataType: BitMask,
})
</script>
<script setup lang="ts">
import type { SerializedImageData } from 'pixel-data-js'
import { computed, reactive, toRef } from 'vue'
import type { NodeId } from '../../lib/pipeline/_types.ts'
import { defineStepHandler, useStepHandler } from '../../lib/pipeline/NodeHandler/StepHandler.ts'
import { handleNodeConfigHMR } from '../../lib/util/vite.ts'
import { canvasDrawCheckboxColors, DEFAULT_SHOW_GRID } from '../../lib/vue/canvas-draw-ui.ts'
import { useInterval } from '../../lib/vue/component-interval.ts'
import { pixelDataRef } from '../../lib/vue/PixelDataRef.ts'
import { nodeUsesSidebar } from '../../lib/vue/useSidebar.ts'
import { useCanvasPaintController } from '../../CanvasEditor/CanvasPaint/CanvasPaintController.ts'
import CanvasPaint from '../../CanvasEditor/CanvasPaint/components/CanvasPaint.vue'
import NodeCard from '../Card/NodeCard.vue'
import CardFooterSettingsTabs from '../UI/CardFooterSettingsTabs.vue'
import CheckboxColorList from '../UIForms/CheckboxColorList.vue'
import { rangeSliderConfig } from '../UIForms/RangeSlider.ts'
import RangeSlider from '../UIForms/RangeSlider.vue'

nodeUsesSidebar()

const { nodeId } = defineProps<{ nodeId: NodeId }>()

const SIZE_DEFAULTS = rangeSliderConfig({
  value: 64,
  min: 8,
  max: 512,
})
const maskPixelDataRef = pixelDataRef()
maskPixelDataRef.set(new ImageData(SIZE_DEFAULTS.value, SIZE_DEFAULTS.value))

const handler = defineStepHandler(STEP_META, {
  config() {
    return {
      ...DEFAULT_SHOW_GRID.CONFIG,
      activeTabIndex: 0,
      size: {
        ...SIZE_DEFAULTS,
      },
      maskImageData: null as (SerializedImageData | null),
    }
  },
  reactiveConfig: reactive,
  serializeConfig: (config) => {
    return {
      ...config,
      maskImageData: maskPixelDataRef.serialize(),
    }
  },
  deserializeConfig(config) {
    maskPixelDataRef.setSerialized(config.maskImageData)

    return config
  },
  async run() {
    const imageData = maskPixelDataRef.getImageData()
    if (imageData === null) return

    const bitMask = BitMask.fromImageData(imageData)

    return {
      preview: imageData,
      output: bitMask,
    }
  },
})

const node = useStepHandler(nodeId, handler)
const config = node.config

if (import.meta.hot && !import.meta.env.VITEST) {
  handleNodeConfigHMR(import.meta.hot, node)
}

const canvasPaintController = useCanvasPaintController({
  id: node.id,
  width: computed(() => config.size.value),
  height: computed(() => config.size.value),
  showGridColor: toRef(config, 'showGridColor'),
  showGrid: toRef(config, 'showGrid'),
  pixelDataRef: maskPixelDataRef,
})

useInterval(() => {
  if (canvasPaintController.state.imageDataDirty) {
    config.maskImageData = canvasPaintController.state.pixelDataRef.serialize()
    canvasPaintController.state.imageDataDirty = false
  }
}, 1000)
</script>
<template>
  <NodeCard
    :node="node"
    :images="[]"
    show-dimensions
  >
    <template #body>
      <CanvasPaint
        :tool-controller="canvasPaintController"
      />
    </template>

    <template #footer>
      <CardFooterSettingsTabs
        :node-id="nodeId"
        v-model:active-tab-index="config.activeTabIndex"
      >
        <template #settings>
          <RangeSlider
            :id="`${nodeId}-size`"
            label="Size"
            :defaults="SIZE_DEFAULTS"
            v-model:value="config.size.value"
            v-model:min="config.size.min"
            v-model:max="config.size.max"
            v-model:step="config.size.step"
          />

          <button
            role="button"
            @click="canvasPaintController.canvasRenderer.clear()"
            class="btn btn-danger btn-sm ms-2"
          >
            Clear Canvas
          </button>
        </template>
        <template #display-options>
          <CheckboxColorList :items="canvasDrawCheckboxColors(config)" />
        </template>
      </CardFooterSettingsTabs>
    </template>
  </NodeCard>
</template>