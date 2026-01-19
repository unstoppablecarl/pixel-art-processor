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
import { computed, type Raw, Ref, ref, toRef, useTemplateRef, watchEffect } from 'vue'
import { PixelMap } from '../../../lib/node-data-types/PixelMap.ts'
import type { NodeId, WatcherTarget } from '../../../lib/pipeline/_types.ts'
import { defineStepHandler, useStepHandler } from '../../../lib/pipeline/NodeHandler/StepHandler.ts'
import { usePipelineStore } from '../../../lib/store/pipeline-store.ts'
import {
  type SerializedImageData,
} from '../../../lib/util/html-dom/ImageData.ts'
import { ImageDataMutator } from '../../../lib/util/html-dom/ImageDataMutator.ts'
import { Sketch } from '../../../lib/util/html-dom/Sketch.ts'
import { handleNodeConfigHMR } from '../../../lib/util/vite.ts'
import { canvasDrawCheckboxColors, DEFAULT_SHOW_CURSOR, DEFAULT_SHOW_GRID } from '../../../lib/vue/canvas-draw-ui.ts'
import { type ImageDataRef, imageDataRef } from '../../../lib/vue/vue-image-data.ts'
import { make4EdgeWangTileset, makeWangTileEdgesPixelMap } from '../../../lib/wang-tiles/wang-tile-vue-helpers.ts'
import { makeWangGrid } from '../../../lib/wang-tiles/WangGrid.ts'
import type { TileId, WangTile } from '../../../lib/wang-tiles/WangTileset.ts'
import CanvasPaint from '../../CanvasPaint.vue'
import NodeCard from '../../Card/NodeCard.vue'
import CardFooterSettingsTabs from '../../UI/CardFooterSettingsTabs.vue'
import CheckboxColorList from '../../UIForms/CheckboxColorList.vue'
import { rangeSliderConfig } from '../../UIForms/RangeSlider.ts'
import RangeSlider from '../../UIForms/RangeSlider.vue'
import RGBA = tinycolor.ColorFormats.RGBA

const store = usePipelineStore()
const canvasPaintRef = useTemplateRef('canvasPaintRef')

const { nodeId } = defineProps<{ nodeId: NodeId }>()

const maskImageData = imageDataRef()

const SIZE_DEFAULTS = rangeSliderConfig({
  value: 64,
  min: 8,
  max: 512,
})

type Config = ReturnType<typeof CONFIG_DEFAULTS>
const CONFIG_DEFAULTS = () => (
  {
    ...DEFAULT_SHOW_GRID.CONFIG,
    ...DEFAULT_SHOW_CURSOR.CONFIG,
    activeTabIndex: 0,
    size: {
      ...SIZE_DEFAULTS,
    },
    maskImageData: null as (SerializedImageData | null),
  }
)
type ReactiveConfig = Omit<Config, 'maskImageData'> & {
  maskImageData: Raw<SerializedImageData> | null
}

type SerializedConfig = Config

const handler = defineStepHandler<Config, SerializedConfig, ReactiveConfig>(STEP_META, {
  config(): Config {
    return CONFIG_DEFAULTS()
  },
  serializeConfig: (config) => {
    return {
      ...config,
      maskImageData: maskImageData.serialize(),
    }
  },
  deserializeConfig(config) {
    config.maskImageData = maskImageData.deserializeConfig(config.maskImageData)

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

if (import.meta.hot && !import.meta.env.VITEST) {
  handleNodeConfigHMR(import.meta.hot, node)
}

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

type TilePixelMapRecords = Record<TileId, {
  tile: WangTile<number>,
  pixelMap: PixelMap
}>

type TileImageDataRefRecords = Record<TileId, {
  tile: WangTile<number>,
  imageDataRef: ImageDataRef
}>

const tileset = make4EdgeWangTileset()

const cachedWangTileEdgeColorPixelMaps = computed((): TilePixelMapRecords => {
  return Object.fromEntries(tileset.tiles.map(tile => [
    tile.id, {
      tile,
      pixelMap: makeWangTileEdgesPixelMap(tileSize.value, tile),
    }],
  ))
})

const tilesetImageRefs = computed((): TileImageDataRefRecords => {
  return Object.fromEntries(
    tileset.tiles.map(tile => {
      return [
        tile.id, {
          tile,
          imageDataRef: imageDataRef(new ImageData(tileSize.value, tileSize.value)),
        },
      ]
    }),
  )
})

const tileGridEdgeColorSketches = new Sketch(0, 0)
watchEffect(() => tileGridEdgeColorSketches.setSize(
  canvasWidth.value,
  canvasHeight.value,
))

const tileGrid = computed(() => makeWangGrid(gridWidth.value, gridHeight.value, tileset))

// draw colored tile edges
watchEffect(() => {
  if (!tileGrid.value) return
  tileGrid.value.each((tx, ty, tile) => {
    if (!tile) return
    const pixelMap = cachedWangTileEdgeColorPixelMaps.value[tile.id].pixelMap
    const x = tx * tileSize.value
    const y = ty * tileSize.value

    tileGridEdgeColorSketches.putImageData(pixelMap.toImageData(), x, y)
  })
})

function gridPixelToTilePixel(gridPixelX: number, gridPixelY: number) {
  if (!tileGrid.value) return
  const x = Math.floor(gridPixelX / tileSize.value)
  const y = Math.floor(gridPixelY / tileSize.value)
  return {
    tile: tileGrid.value.get(x, y),
    pixelX: gridPixelX % tileSize.value,
    pixelY: gridPixelY % tileSize.value,
  }
}

function tilePixelToGridPixel(tileX: number, tileY: number, pixelX: number, pixelY: number) {
  return {
    gridX: tileX * tileSize.value + pixelX,
    gridY: tileY * tileSize.value + pixelY,
  }
}

const mutator = new ImageDataMutator()

function setPixel(x: number, y: number, color: RGBA) {

  if (!tileGrid.value) return
  const { tile, pixelX, pixelY } = gridPixelToTilePixel(x, y)!
  if (!tile) return
  const tilesetImageDataRef = tilesetImageRefs.value[tile.id].imageDataRef!
  const imageData = tilesetImageDataRef.get()
  if (!imageData) return

  mutator.set(imageData)
  mutator.setPixel(pixelX, pixelY, color)
  tilesetImageDataRef.triggerRef()

// console.log('setPixel', pixelX, pixelY, color)
  // tileGrid.value.eachWithTileId(tile.id).forEach(t => {
  //   const tileX = t.x
  //   const tileY = t.y
  //
  //   const gridPixel = tilePixelToGridPixel(tileX, tileY, pixelX, pixelY)
  //
  //   // @TODO set pixel on all instances of the tile
  //
  // })
}

function drawUnder(ctx: CanvasRenderingContext2D) {
  // ctx.fillStyle = '#ff0000'
  // ctx.fillRect(0,0,20,20)
  // ctx.drawImage(tileGridSketch.canvas, 0, 0)

  // if (!tileGrid.value) return
  // tileGrid.value.each((tileX, tileY, tile) => {
  //   if (!tile) return
  //   const { gridX, gridY } = tilePixelToGridPixel(tileX, tileY, 0, 0)
  //
  //   const pixelMap = tilesetPixelMaps.value.get(tile.id)!
  //   ctx.putImageData(pixelMap.toImageData(), gridX, gridY, 0, 0, tileSize.value, tileSize.value)
  // })
}

function drawOver(ctx: CanvasRenderingContext2D) {

  // ctx.fillStyle = '#ff0000'
  // ctx.fillRect(0,0,20,20)

  ctx.drawImage(tileGridEdgeColorSketches.canvas, 0, 0)
}

const images = computed(() => Object.values(tilesetImageRefs.value).map(m => {
  console.log('images')
  const edgeColorPM = cachedWangTileEdgeColorPixelMaps.value[m.tile.id].pixelMap

  m.imageDataRef.watchTarget
  const contentPM = PixelMap.fromImageData(m.imageDataRef.get()!)
  const PM = edgeColorPM.copy().merge(contentPM)

  return {
    imageData: PM.toImageData(),
  }
}))
</script>
<template>
  <NodeCard
    :node="node"
    :images="images"
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
        :draw-layer-under="drawUnder"
        :draw-layer-over="drawOver"
        :image-data-ref="maskImageData"
        @set-pixel="setPixel"
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