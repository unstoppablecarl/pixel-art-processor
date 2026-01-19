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
import { computed, markRaw, onMounted, type Raw, Ref, ref, toRef, useTemplateRef, watch } from 'vue'
import type { Point } from '../../../lib/node-data-types/BaseDataStructure.ts'
import type { NodeId } from '../../../lib/pipeline/_types.ts'
import { defineStepHandler, useStepHandler } from '../../../lib/pipeline/NodeHandler/StepHandler.ts'
import { usePipelineStore } from '../../../lib/store/pipeline-store.ts'
import { parseColor } from '../../../lib/util/color.ts'
import {
  type SerializedImageData,
} from '../../../lib/util/html-dom/ImageData.ts'
import { ImageDataMutator } from '../../../lib/util/html-dom/ImageDataMutator.ts'
import { handleNodeConfigHMR } from '../../../lib/util/vite.ts'
import { markRawOrNull } from '../../../lib/util/vue-util.ts'
import { useDirtyBatching } from '../../../lib/vue/batching.ts'
import { canvasDrawCheckboxColors, DEFAULT_SHOW_CURSOR, DEFAULT_SHOW_GRID } from '../../../lib/vue/canvas-draw-ui.ts'
import {
  make4EdgeWangTileImages,
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

const {
  tileSize,
  gridWidth,
  gridHeight,
  canvasWidth,
  canvasHeight,
  tileset,
  tileGrid,
  tilesetImageRefs,
  maskImageDataSketch,
  tileGridEdgeColorSketch,
  cachedWangTileEdgeColorImageData,
  gridPixelToTilePixel,
  tilePixelToGridPixel,
} = make4EdgeWangTileImages()

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
      // maskImageData: maskImageData.serialize(),
    }
  },
  deserializeConfig(config) {
    // config.maskImageData = maskImageData.deserializeConfig(config.maskImageData)

    config.wangTiles = Object.fromEntries(
      Object.entries(config.wangTiles).map(([tileId, tile]) => {
        const id = tileId as TileId

        const imgDataRef = tilesetImageRefs?.[id]?.imageDataRef

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

const cursorColor = toRef(config, 'showCursorColor')
const gridColor = toRef(config, 'showGridColor')

const mode = ref<'add' | 'remove'>('add')
const color = computed(() => mode.value === 'add' ? parseColor('#fff') : parseColor('#000'))

tileSize.value = config.size.value
watch(tileSize, () => config.size.value = tileSize.value)

const tilesetCanvases = ref<Record<TileId, HTMLCanvasElement>>({})

function setCanvasRef(el: HTMLCanvasElement | null, tileId: TileId) {
  if (!el) throw new Error('invalid canvas element')
  tilesetCanvases.value[tileId] = el
}

const mutator = new ImageDataMutator()

function setPixels(pixels: Point[]) {
  if (!tileGrid.value) return

  pixels.forEach(({ x, y }) => {
    const { tile, pixelX, pixelY } = gridPixelToTilePixel(x, y)!
    if (!tile) return
    const tilesetImageDataRef = tilesetImageRefs[tile.id].imageDataRef!
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

async function drawTileToTileCanvas(tileId: TileId, imageData: ImageData) {
  const canvas = tilesetCanvases.value[tileId]
  if (!canvas) return
  const ctx = canvas.getContext('2d')!
  ctx.putImageData(imageData, 0, 0)

  const borderImageData = cachedWangTileEdgeColorImageData.value[tileId].imageData
  const bitmap = await createImageBitmap(borderImageData)
  ctx.globalAlpha = 0.5
  ctx.drawImage(bitmap, 0, 0)
  ctx.globalAlpha = 1
}

function drawTileToMaskSketch(tileId: TileId, imageData: ImageData) {
  if (!tileGrid.value) return
  tileGrid.value.eachWithTileId(tileId, (tileX, tileY, tile) => {
    if (!tile) return
    const { gridX, gridY } = tilePixelToGridPixel(tileX, tileY, 0, 0)
    maskImageDataSketch.putImageData(imageData, gridX, gridY)
  })
}

function syncTile(tileId: TileId) {
  const tilesetImageDataRef = tilesetImageRefs[tileId].imageDataRef!
  const imageData = tilesetImageDataRef.get()
  if (!imageData) return

  drawTileToTileCanvas(tileId, imageData)
  drawTileToMaskSketch(tileId, imageData)

  config.wangTiles[tileId] = markRaw({
    tile: markRaw(tileset.byId.get(tileId)!),
    imageData: tilesetImageDataRef.serialize(),
  })
}

function drawUnder(ctx: CanvasRenderingContext2D) {
  // ctx.fillStyle = '#ff0000'
  // ctx.fillRect(0,0,20,20)
}

function drawOver(ctx: CanvasRenderingContext2D) {
  ctx.drawImage(maskImageDataSketch.canvas, 0, 0)
  ctx.globalAlpha = 0.5
  ctx.drawImage(tileGridEdgeColorSketch.canvas, 0, 0)
  ctx.globalAlpha = 1
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
      <canvas
        v-for="(item, index) in tileset.tiles"
        :key="index"
        :ref="el => setCanvasRef(el as HTMLCanvasElement | null, item.id)"
        :width="tileSize"
        :height="tileSize"
      >
      </canvas>
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
        :color="color"
        :draw-layer-under="drawUnder"
        :draw-layer-over="drawOver"
        @set-pixels="setPixels"
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