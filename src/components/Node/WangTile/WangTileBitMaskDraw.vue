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
import { computed, markRaw, onMounted, type Raw, reactive, Ref, ref, toRef, useTemplateRef, watch } from 'vue'
import type { Point } from '../../../lib/node-data-types/BaseDataStructure.ts'
import type { NodeId } from '../../../lib/pipeline/_types.ts'
import { defineStepHandler, useStepHandler } from '../../../lib/pipeline/NodeHandler/StepHandler.ts'
import { usePipelineStore } from '../../../lib/store/pipeline-store.ts'
import { parseColor } from '../../../lib/util/color.ts'
import {
  type SerializedImageData, serializeImageData,
} from '../../../lib/util/html-dom/ImageData.ts'
import { ImageDataMutator } from '../../../lib/util/html-dom/ImageDataMutator.ts'
import { handleNodeConfigHMR } from '../../../lib/util/vite.ts'
import { markRawOrNull } from '../../../lib/util/vue-util.ts'
import { useDirtyBatching } from '../../../lib/vue/batching.ts'
import { canvasDrawCheckboxColors, DEFAULT_SHOW_CURSOR, DEFAULT_SHOW_GRID } from '../../../lib/vue/canvas-draw-ui.ts'
import { imageDataRef } from '../../../lib/vue/vue-image-data.ts'
import {
  make4EdgeWangTileImages, make4EdgeWangTileset, useTileCanvases,
} from '../../../lib/wang-tiles/wang-tile-vue-helpers.ts'
import type { TileId, WangTile } from '../../../lib/wang-tiles/WangTileset.ts'
import CanvasPaint from '../../CanvasPaint.vue'
import NodeCard from '../../Card/NodeCard.vue'
import CardFooterSettingsTabs from '../../UI/CardFooterSettingsTabs.vue'
import CheckboxColorList from '../../UIForms/CheckboxColorList.vue'
import { rangeSliderConfig } from '../../UIForms/RangeSlider.ts'
import RangeSlider from '../../UIForms/RangeSlider.vue'

const store = usePipelineStore()
const canvasPaintRef = useTemplateRef('canvasPaintRef')

const { nodeId } = defineProps<{ nodeId: NodeId }>()

const tileset = make4EdgeWangTileset()
const tilesetImageRefs = reactive(Object.fromEntries(
  tileset.tiles.map(tile => {
    return [tile.id, imageDataRef()]
  }),
))
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
    wangTiles: {} as Record<TileId, {
      tile: WangTile<number>,
      imageData: Raw<SerializedImageData> | null
    }>,
  }
)

const handler = defineStepHandler<Config>(STEP_META, {
  config(): Config {
    return CONFIG_DEFAULTS()
  },
  deserializeConfig(config) {
    config.wangTiles = Object.fromEntries(
      Object.entries(config.wangTiles).map(([tileId, tile]) => {
        const id = tileId as TileId

        const imgDataRef = tilesetImageRefs?.[id]
        //
        let imageData: Raw<SerializedImageData> | null
        if (imgDataRef) {
          imageData = imgDataRef.deserializeConfig(tile.imageData)
        } else {
          imageData = markRawOrNull(tile.imageData)
        }

        return [id, {
          tile: tile.tile,
          imageData,
        }]
      }),
    )

    return config
  },
  // watcherTargets(_node, defaultWatcherTargets: WatcherTarget[]): WatcherTarget[] {
  //   return [...defaultWatcherTargets, {
  //     name: 'maskImageData',
  //     target: () => maskImageData.watchTarget,
  //   }]
  // },
  async run() {
    // const imageData = maskImageData.get()
    // if (imageData === null) return
    //
    // const bitMask = BitMask.fromImageData(imageData)
    //
    // return {
    //   preview: imageData,
    //   output: bitMask,
    // }
  },
})

const node = useStepHandler(nodeId, handler)
const config = node.config

if (import.meta.hot && !import.meta.env.VITEST) {
  handleNodeConfigHMR(import.meta.hot, node)
}

const brushShape = ref<'circle' | 'square'>('circle')
const brushSize: Ref<number> = ref(10)
const mode = ref<'add' | 'remove'>('add')
const cursorColor = toRef(config, 'showCursorColor')
const gridColor = toRef(config, 'showGridColor')
const color = computed(() => mode.value === 'add' ? parseColor('#fff') : { r: 0, g: 0, b: 0, a: 0 })

const tileSize = computed(() => config.size.value)
const gridWidth = ref(6)
const gridHeight = ref(6)

const {
  tilesetCanvases,
  setCanvasRef,
} = useTileCanvases()

const {
  canvasWidth,
  canvasHeight,
  tileGrid,
  tileGridEdgeColorSketch,
  cachedWangTileEdgeColorImageData,
  gridPixelToTilePixel,
  tilePixelToGridPixel,
} = make4EdgeWangTileImages(
  tileset,
  tileSize,
  gridWidth,
  gridHeight,
)

let maskImageData = new ImageData(canvasWidth.value, canvasHeight.value)
watch([canvasWidth, canvasHeight], () => {
  maskImageData = markRaw(new ImageData(canvasWidth.value, canvasHeight.value))
})

watch(tileSize, () => {
  Object.values(tilesetImageRefs).forEach(item => {
    if (!item.hasValue) {
      item.set(new ImageData(tileSize.value, tileSize.value))
    }
  })

  Object.values(tilesetCanvases.value).forEach(canvasEl => {
    canvasEl.width = tileSize.value
    canvasEl.height = tileSize.value
  })

}, { immediate: true })

const mutator = new ImageDataMutator()

function setPixels(pixels: Point[]) {
  if (!tileGrid.value) return

  pixels.forEach(({ x, y }) => {
    const { tile, pixelX, pixelY } = gridPixelToTilePixel(x, y)!
    if (!tile) return
    const tilesetImageDataRef = tilesetImageRefs[tile.id]!
    const imageData = tilesetImageDataRef.get()
    if (!imageData) return

    mutator.set(imageData)
    mutator.setPixel(pixelX, pixelY, color.value)

    markDirty(tile.id)
  })
}

const { markDirty } = useDirtyBatching<TileId>((dirtyTiles) => {
  for (const tileId of dirtyTiles) {
    syncTile(tileId)
  }
})

function drawTileToTileCanvas(tileId: TileId, imageData: ImageData) {
  const canvas = tilesetCanvases.value[tileId]
  if (!canvas) return
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.putImageData(imageData, 0, 0)

  const borderImageData = cachedWangTileEdgeColorImageData.value[tileId]

  mutator.set(borderImageData)
  ctx.globalAlpha = 0.5
  mutator.drawOnto(ctx)
  ctx.globalAlpha = 1
}

function drawTileToMaskImageDataRef(tileId: TileId, imageData: ImageData) {
  mutator.set(maskImageData)

  if (!tileGrid.value) return
  tileGrid.value.eachWithTileId(tileId, (tileX, tileY, tile) => {
    if (!tile) return
    const { gridX, gridY } = tilePixelToGridPixel(tileX, tileY, 0, 0)
    mutator.putImageData(imageData, gridX, gridY)
  })
}

function syncTile(tileId: TileId) {
  const tilesetImageDataRef = tilesetImageRefs[tileId]!
  const imageData = tilesetImageDataRef.get()
  if (!imageData) return

  drawTileToTileCanvas(tileId, imageData)
  drawTileToMaskImageDataRef(tileId, imageData)

  config.wangTiles[tileId] = {
    tile: tileset.byId.get(tileId)!,
    imageData: serializeImageData(imageData),
  }
}

function draw(ctx: CanvasRenderingContext2D) {
  mutator.set(maskImageData)
    .drawOnto(ctx)
  ctx.drawImage(tileGridEdgeColorSketch.canvas, 0, 0)
}

function clear() {
  Object.entries(tilesetImageRefs).forEach(([tileId, item]) => {
      item.clearPixels()

      markDirty(tileId as TileId)
    },
  )
}

onMounted(() => {
  tileset.tiles.forEach(tile => markDirty(tile.id))
})
</script>
<template>
  <NodeCard
    :node="node"
    :images="[]"
    :img-columns="4"
    show-dimensions
  >
    <template #body>
      <div v-for="(item, index) in tileset.tiles" :key="index">
        <canvas
          :ref="el => setCanvasRef(el as HTMLCanvasElement | null, item.id)"
          :width="tileSize"
          :height="tileSize"
          class="canvas-tile"
        >
        </canvas>
        <div>
          {{ item.id }}
        </div>
      </div>
    </template>
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
        :draw="draw"
        @set-pixels="setPixels"
        @clear="clear"
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
<style lang="scss">
.canvas-tile {
  width: calc(var(--node-img-width, 150px) * var(--node-img-scale, 1));
  height: calc(var(--node-img-width, 150px) * var(--node-img-scale, 1));
  image-rendering: pixelated;
}
</style>