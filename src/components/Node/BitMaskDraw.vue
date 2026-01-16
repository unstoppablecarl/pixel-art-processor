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
import { computed, Ref, ref, toRef, useTemplateRef } from 'vue'
import type { NodeId, Position, WatcherTarget } from '../../lib/pipeline/_types.ts'
import { defineStepHandler, useStepHandler } from '../../lib/pipeline/NodeHandler/StepHandler.ts'
import { usePipelineStore } from '../../lib/store/pipeline-store.ts'
import {
  deserializeImageData,
  type SerializedImageData, serializeImageData,
} from '../../lib/util/ImageData.ts'
import { imageDataRef } from '../../lib/util/vue-util.ts'
import { canvasDrawCheckboxColors, DEFAULT_SHOW_CURSOR, DEFAULT_SHOW_GRID } from '../../lib/vue/canvas-draw-ui.ts'
import CanvasPaint from '../CanvasPaint.vue'
import NodeCard from '../Card/NodeCard.vue'
import CardFooterSettingsTabs from '../UI/CardFooterSettingsTabs.vue'
import CheckboxColorList from '../UIForms/CheckboxColorList.vue'
import { rangeSliderConfig } from '../UIForms/RangeSlider.ts'
import RangeSlider from '../UIForms/RangeSlider.vue'

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
const config = node.config

const width = computed(() => config.size.value)
const height = computed(() => config.size.value)
const brushShape = ref<'circle' | 'square'>('circle')
const brushSize: Ref<number> = ref(10)
const offset: Ref<Position> = ref({ x: 0, y: 0 })

const cursorColor = toRef(config, 'showCursorColor')
const gridColor = toRef(config, 'showGridColor')
const foo = ref<ImageData | null>(null)

const mode = ref<'add' | 'remove'>('add')
const color = computed(() => mode.value === 'add' ? '#fff' : '#000')
</script>
<template>
  <NodeCard
    :node="node"
    :images="[{
      label: 'BitMaskFromImage Input',
      imageData: foo,
    }]"
    show-dimensions
  >
    <template #body>
      <CanvasPaint
        ref="canvasPaintRef"
        :scale="store.imgScale"
        :width="width"
        :height="height"
        :brush-shape="brushShape"
        :brush-size="brushSize"
        :cursor-color="cursorColor"
        :grid-color="gridColor"
        :color="color"
        v-model:offset="offset"

        :image-data-ref="maskImageData"
      />
    </template>

    <template #footer>
      <CardFooterSettingsTabs
        :node-id="nodeId"
        :active-tab-index="config.activeTabIndex"
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

          <RangeSlider
            :id="`${nodeId}-brush-size`"
            label="Brush Size"
            v-model:value="brushSize"
            :min="1"
            :max="50"
            :step="1"
          />

          <div class="btn-group" role="group">
            <button
              @click="brushShape = 'square'"
              :class="['btn btn-sm', brushShape === 'square' ? 'btn-primary' : 'btn-outline-primary']"
              title="Square Brush"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18"></rect>
              </svg>
            </button>
            <button
              @click="brushShape = 'circle'"
              :class="['btn btn-sm', brushShape === 'circle' ? 'btn-primary' : 'btn-outline-primary']"
              title="Circle Brush"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="9"></circle>
              </svg>
            </button>
          </div>

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