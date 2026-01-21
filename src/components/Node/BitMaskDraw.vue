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
import { computed, ref, toRef, useTemplateRef } from 'vue'
import type { NodeId, WatcherTarget } from '../../lib/pipeline/_types.ts'
import { defineStepHandler, useStepHandler } from '../../lib/pipeline/NodeHandler/StepHandler.ts'
import { useCanvasPaintStore } from '../../lib/store/canvas-paint-store.ts'
import { usePipelineStore } from '../../lib/store/pipeline-store.ts'
import {
  type SerializedImageData,
} from '../../lib/util/html-dom/ImageData.ts'
import { canvasDrawCheckboxColors, DEFAULT_SHOW_CURSOR, DEFAULT_SHOW_GRID } from '../../lib/vue/canvas-draw-ui.ts'
import { nodeUsesSidebar } from '../../lib/vue/useSidebar.ts'
import { imageDataRef } from '../../lib/vue/vue-image-data.ts'
import CanvasPaint from '../CanvasPaint.vue'
import NodeCard from '../Card/NodeCard.vue'
import CardFooterSettingsTabs from '../UI/CardFooterSettingsTabs.vue'
import CheckboxColorList from '../UIForms/CheckboxColorList.vue'
import { rangeSliderConfig } from '../UIForms/RangeSlider.ts'
import RangeSlider from '../UIForms/RangeSlider.vue'

nodeUsesSidebar()

const store = usePipelineStore()
const canvasPaintRef = useTemplateRef('canvasPaintRef')

const { nodeId } = defineProps<{ nodeId: NodeId }>()

const maskImageData = imageDataRef()

const SIZE_DEFAULTS = rangeSliderConfig({
  value: 64,
  min: 8,
  max: 512,
})

const handler = defineStepHandler(STEP_META, {
  config() {
    return {
      ...DEFAULT_SHOW_GRID.CONFIG,
      ...DEFAULT_SHOW_CURSOR.CONFIG,
      activeTabIndex: 0,
      size: {
        ...SIZE_DEFAULTS,
      },
      maskImageData: null as (SerializedImageData | null),
    }
  },
  serializeConfig: (config) => {
    return {
      ...config,
      maskImageData: maskImageData.serialize(),
    }
  },
  deserializeConfig(config) {
    maskImageData.setSerialized(config.maskImageData)

    return config
  },
  watcherTargets(_node, defaultWatcherTargets: WatcherTarget[]): WatcherTarget[] {
    return [...defaultWatcherTargets, {
      name: 'maskImageData',
      target: () => maskImageData.watchTarget,
    }]
  },
  async run() {
    const imageData = maskImageData.get()
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

const width = computed(() => config.size.value)
const height = computed(() => config.size.value)
const cursorColor = toRef(config, 'showCursorColor')
const gridColor = toRef(config, 'showGridColor')

const { brushShape, brushSize } = useCanvasPaintStore()

const mode = ref<'add' | 'remove'>('add')
const color = computed(() => mode.value === 'add' ? '#fff' : '#000')
</script>
<template>
  <NodeCard
    :node="node"
    :images="[]"
    show-dimensions
  >
    <template #body>
      <CanvasPaint
        :id="`${nodeId}-canvas-paint`"
        ref="canvasPaintRef"
        :scale="store.imgScale"
        :width="width"
        :height="height"
        :brush-shape="brushShape"
        :brush-size="brushSize"
        :cursor-color="cursorColor"
        :grid-color="gridColor"
        :color="color"
        :image-data-ref="maskImageData"
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
            @click="canvasPaintRef?.clearCanvas()"
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