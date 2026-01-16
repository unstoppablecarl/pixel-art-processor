<script lang="ts">
import { BitMask } from '../../../lib/node-data-types/BitMask.ts'
import { type NodeDef, NodeType } from '../../../lib/pipeline/_types.ts'
import { defineStep } from '../../../lib/pipeline/types/definitions.ts'

export const STEP_META = defineStep({
  type: NodeType.STEP,
  def: 'wang_tile_bit_mask_draw_image' as NodeDef,
  displayName: 'Wang Tile | BitMask: Draw',
  noInput: true,
  outputDataType: BitMask,
})
</script>
<script setup lang="ts">
import { computed, Ref, ref, toRef, useTemplateRef } from 'vue'
import { PixelMap } from '../../../lib/node-data-types/PixelMap.ts'
import type { NodeId, WatcherTarget } from '../../../lib/pipeline/_types.ts'
import { defineStepHandler, useStepHandler } from '../../../lib/pipeline/NodeHandler/StepHandler.ts'
import { usePipelineStore } from '../../../lib/store/pipeline-store.ts'
import { parseColor } from '../../../lib/util/color.ts'
import {
  deserializeImageData,
  type SerializedImageData, serializeImageData,
} from '../../../lib/util/html-dom/ImageData.ts'
import { imageDataRef } from '../../../lib/util/vue-util.ts'
import { canvasDrawCheckboxColors, DEFAULT_SHOW_CURSOR, DEFAULT_SHOW_GRID } from '../../../lib/vue/canvas-draw-ui.ts'
import { make4EdgeWangTileset } from '../../../lib/wang-tiles/wang-tile-vue-helpers.ts'
import { makeWangGrid } from '../../../lib/wang-tiles/WangGrid.ts'
import { type WangTile } from '../../../lib/wang-tiles/WangTileset.ts'
import CanvasPaint from '../../CanvasPaint.vue'
import NodeCard from '../../Card/NodeCard.vue'
import CardFooterSettingsTabs from '../../UI/CardFooterSettingsTabs.vue'
import CheckboxColorList from '../../UIForms/CheckboxColorList.vue'
import { rangeSliderConfig } from '../../UIForms/RangeSlider.ts'
import RangeSlider from '../../UIForms/RangeSlider.vue'

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
      target: maskImageData.watchTarget,
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

const brushShape = ref<'circle' | 'square'>('circle')
const brushSize: Ref<number> = ref(10)

const cursorColor = toRef(config, 'showCursorColor')
const gridColor = toRef(config, 'showGridColor')

const mode = ref<'add' | 'remove'>('add')
const color = computed(() => mode.value === 'add' ? '#fff' : '#000')

const tileSize = computed(() => config.size.value)
const gridWidth = ref(4)
const gridHeight = ref(4)
const canvasWidth = computed(() => tileSize.value * gridWidth.value)
const canvasHeight = computed(() => tileSize.value * gridHeight.value)

const tileset = make4EdgeWangTileset()
const tileGrid = computed(() => makeWangGrid(gridWidth.value, gridHeight.value, tileset))

function makePreviewFromWangTile(size: number, tile: WangTile<number>) {
  const pixelMap = new PixelMap(size, size)
  const nIndex = tile.edges.N
  const eIndex = tile.edges.E
  const sIndex = tile.edges.S
  const wIndex = tile.edges.W
  const colors = [
    parseColor('#ff0000'),
    parseColor('#00ff00'),
    parseColor('#0000ff'),
    parseColor('#ffff00'),
  ]

  pixelMap.setEdgeNPadded(colors[nIndex], 1)
  pixelMap.setEdgeEPadded(colors[eIndex], 1)
  pixelMap.setEdgeSPadded(colors[sIndex], 1)
  pixelMap.setEdgeWPadded(colors[wIndex], 1)

  return pixelMap
}

const tilePreviews = tileset.tiles.map((tile) => {

  return {
    imageData: makePreviewFromWangTile(64, tile).toImageData(),
  }

})
</script>
<template>
  <NodeCard
    :node="node"
    :images="tilePreviews"
    :img-columns="4"
    show-dimensions
  >
    <template #footer>

      <CanvasPaint
        ref="canvasPaintRef"
        :scale="store.imgScale"
        :width="canvasWidth"
        :height="canvasHeight"
        :brush-shape="brushShape"
        :brush-size="brushSize"
        :cursor-color="cursorColor"
        :grid-color="gridColor"
        :color="color"

        :image-data-ref="maskImageData"
      />

      <CardFooterSettingsTabs
        :node-id="nodeId"
        v-model:active-tab-index="config.activeTabIndex"
      >
        <template #settings>
          {{ store.imgScale }}
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