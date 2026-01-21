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
import {
  computed,
  markRaw,
  onMounted,
  type Raw, type Reactive,
  Ref,
  ref,
  useTemplateRef,
  watch,
} from 'vue'
import type { Point } from '../../../lib/node-data-types/BaseDataStructure.ts'
import type { NodeId } from '../../../lib/pipeline/_types.ts'
import { defineStepHandler, useStepHandler } from '../../../lib/pipeline/NodeHandler/StepHandler.ts'
import { usePipelineStore } from '../../../lib/store/pipeline-store.ts'
import { parseColor } from '../../../lib/util/color.ts'
import {
  putImageDataScaled,
  type SerializedImageData, serializeImageData, setImageDataPixelColor, writeImageData,
} from '../../../lib/util/html-dom/ImageData.ts'
import { handleNodeConfigHMR } from '../../../lib/util/vite.ts'
import { reactiveFromRefs } from '../../../lib/util/vue-util.ts'
import { useDirtyBatching } from '../../../lib/vue/batching.ts'
import { canvasDrawCheckboxColors, DEFAULT_SHOW_CURSOR, DEFAULT_SHOW_GRID } from '../../../lib/vue/canvas-draw-ui.ts'
import { imageDataRef, tilesetSyncedImageDataRef } from '../../../lib/vue/vue-image-data.ts'
import {
  useTileCanvases,
} from '../../../lib/wang-tiles/wang-tile-vue-helpers.ts'
import { makeAxialEdgeWangTileManager } from '../../../lib/wang-tiles/AxialEdgeWangTileManager.ts'
import {
  createAxialEdgeWangTileset,
  type TileId,
  type WangTile,
} from '../../../lib/wang-tiles/WangTileset.ts'
import CanvasPaint from '../../CanvasPaint.vue'
import NodeCard from '../../Card/NodeCard.vue'
import CardFooterSettingsTabs from '../../UI/CardFooterSettingsTabs.vue'
import CheckboxColorList from '../../UIForms/CheckboxColorList.vue'
import NumberInput from '../../UIForms/NumberInput.vue'
import RangeSlider from '../../UIForms/RangeSlider.vue'

const store = usePipelineStore()
const canvasPaintRef = useTemplateRef<typeof CanvasPaint>('canvasPaintRef')

const { nodeId } = defineProps<{ nodeId: NodeId }>()

type Config = ReturnType<typeof CONFIG_DEFAULTS>
const CONFIG_DEFAULTS = () => (
  {
    ...DEFAULT_SHOW_GRID.CONFIG,
    ...DEFAULT_SHOW_CURSOR.CONFIG,
    activeTabIndex: 0,
    tileSize: 64,
    wangTiles: markRaw({}) as Record<TileId, {
      tile: WangTile<number>,
      imageData: Raw<SerializedImageData> | null
    }>,
    verticalEdgeValueCount: 2,
    horizontalEdgeValueCount: 2,
    tileMarginCopySize: 3,
  }
)

const defaults = CONFIG_DEFAULTS()

const tileSize = ref(defaults.tileSize)
const verticalEdgeValueCount = ref(defaults.verticalEdgeValueCount)
const horizontalEdgeValueCount = ref(defaults.horizontalEdgeValueCount)

const tileset = computed(() => createAxialEdgeWangTileset(
  verticalEdgeValueCount.value,
  horizontalEdgeValueCount.value,
))
const tilesetImageRefs = tilesetSyncedImageDataRef(tileset, tileSize)

const handler = defineStepHandler<Config>(STEP_META, {
  config(): Config {
    return CONFIG_DEFAULTS()
  },
  reactiveConfig(defaults) {

    verticalEdgeValueCount.value = defaults.verticalEdgeValueCount
    horizontalEdgeValueCount.value = defaults.horizontalEdgeValueCount
    tileSize.value = defaults.tileSize

    return reactiveFromRefs(defaults, {
      verticalEdgeValueCount,
      horizontalEdgeValueCount,
      tileSize,
    }) as Reactive<Config>
  },
  deserializeConfig(config) {
    config.wangTiles = Object.fromEntries(
      Object.entries(config.wangTiles).map(([tileId, tile]) => {
        const id = tileId as TileId

        const imgDataRef = tilesetImageRefs?.[id]
        let imageData: Raw<SerializedImageData> | null
        if (imgDataRef) {
          imageData = imgDataRef.deserializeConfig(tile.imageData)
        } else {
          const newRef = imageDataRef()
          tilesetImageRefs[id] = newRef
          imageData = newRef.deserializeConfig(tile.imageData)
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
const brushMode = ref<'add' | 'remove'>('add')
const color = computed(() => brushMode.value === 'add' ? parseColor('#fff') : { r: 0, g: 0, b: 0, a: 0 })

const {
  tilesetCanvases,
  setCanvasPaintRef,
} = useTileCanvases()

function setCanvasPaint(comp: typeof CanvasPaint | null, tileId: TileId) {
  if (tilesetCanvases.has(tileId)) return
  setCanvasPaintRef(comp, tileId)
  markDirty(tileId)
}

const {
  canvasWidth,
  canvasHeight,
  tileGrid,
  tileGridEdgeColorSketch,
  cachedWangTileEdgeColorImageData,
  gridPixelToTilePixel,
  tilePixelToGridPixel,
  duplicateEdgePixels,
} = makeAxialEdgeWangTileManager(
  tileset,
  tileSize,
)

let maskImageData = imageDataRef(new ImageData(canvasWidth.value, canvasHeight.value))
watch([canvasWidth, canvasHeight], () => {
  maskImageData.resize(canvasWidth.value, canvasHeight.value)
})

watch(tileSize, () => {
  for (const [_key, item] of tilesetCanvases) {
    item.canvas.width = tileSize.value
    item.canvas.height = tileSize.value
  }
}, { immediate: true })

function setPixels(pixels: Point[]) {
  if (!tileGrid.value) return
  pixels.forEach(({ x, y }) => {
    const { tile, pixelX, pixelY } = gridPixelToTilePixel(x, y)!
    if (!tile) return
    const tilesetImageDataRef = tilesetImageRefs[tile.id]!
    const imageData = tilesetImageDataRef.get()
    if (!imageData) return
    setImageDataPixelColor(imageData, pixelX, pixelY, color.value)

    const affectedTiles = duplicateEdgePixels(
      tilesetImageRefs,
      tile.id,
      [{ x: pixelX, y: pixelY }],
      color.value,
      config.tileMarginCopySize,
    )

    affectedTiles?.forEach(t => markDirty(t.id))
    markDirty(tile.id)
  })
}

function setTilePixels(pixels: Point[], tileId: TileId) {
  pixels.forEach(({ x, y }) => {
    const tilesetImageDataRef = tilesetImageRefs[tileId]
    const imageData = tilesetImageDataRef.get()!

    setImageDataPixelColor(imageData, x, y, color.value)
  })

  const affectedTiles = duplicateEdgePixels(
    tilesetImageRefs,
    tileId,
    pixels,
    color.value,
    config.tileMarginCopySize,
  )

  affectedTiles?.forEach(t => markDirty(t.id))
  markDirty(tileId)
}

const { markDirty } = useDirtyBatching<TileId>((dirtyTiles) => {
  for (const tileId of dirtyTiles) {
    syncTile(tileId)
  }
  canvasPaintRef.value!.queueRender()
})

function drawTileToGrid(tileId: TileId, imageData: ImageData) {
  if (!tileGrid.value) return
  tileGrid.value.eachWithTileId(tileId, (tileX, tileY, tile) => {
    if (!tile) return
    const { gridX, gridY } = tilePixelToGridPixel(tileX, tileY, 0, 0)

    writeImageData(maskImageData.get()!, imageData, gridX, gridY)
  })
}

function syncTile(tileId: TileId) {
  const tilesetImageDataRef = tilesetImageRefs[tileId]!
  const imageData = tilesetImageDataRef.get()
  if (!imageData) return

  drawTileToGrid(tileId, imageData)

  config.wangTiles[tileId] = {
    tile: tileset.value.byId.get(tileId)!,
    imageData: serializeImageData(imageData),
  }

  const item = tilesetCanvases.get(tileId)!
  item?.queueRender()
}

function drawGridCanvas(ctx: CanvasRenderingContext2D) {
  putImageDataScaled(ctx, canvasWidth.value, canvasHeight.value, maskImageData.get()!, 0, 0)
  ctx.drawImage(tileGridEdgeColorSketch.canvas, 0, 0)
}

function drawTileCanvas(ctx: CanvasRenderingContext2D, tileId: TileId) {
  const tilesetImageDataRef = tilesetImageRefs[tileId]!
  const imageData = tilesetImageDataRef.get()
  if (!imageData) return

  ctx.clearRect(0, 0, tileSize.value, tileSize.value)
  putImageDataScaled(ctx, tileSize.value, tileSize.value, imageData)

  const borderImageData = cachedWangTileEdgeColorImageData.value[tileId]

  ctx.globalAlpha = 0.5
  putImageDataScaled(ctx, tileSize.value, tileSize.value, borderImageData)
  ctx.globalAlpha = 1
}

function clear() {
  Object.entries(tilesetImageRefs).forEach(([tileId, item]) => {
      item.clearPixels()
      markDirty(tileId as TileId)
    },
  )
}

function redrawAll() {
  tileset.value.tiles.forEach(tile => markDirty(tile.id))
}

onMounted(() => {
  watch(tileSize, () => redrawAll(), { immediate: true })
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
      <div class="canvas-tile-container" v-for="item in tileset.tiles" :key="item.id">
        <CanvasPaint
          :ref="comp => setCanvasPaint(comp as any, item.id)"
          :id="item.id"
          :scale="store.imgScale"
          :width="tileSize"
          :height="tileSize"
          :brush-shape="brushShape"
          :brush-size="brushSize"
          :cursor-color="config.showCursorColor"
          :grid-color="config.showGridColor"
          :draw="($event) => drawTileCanvas($event, item.id)"
          @set-pixels="setTilePixels($event, item.id)"
        />
      </div>
    </template>
    <template #footer>
      <CanvasPaint
        ref="canvasPaintRef"
        id="grid"
        :scale="store.imgScale"
        :width="canvasWidth"
        :height="canvasHeight"
        :brush-shape="brushShape"
        :brush-size="brushSize"
        :cursor-color="config.showCursorColor"
        :grid-color="config.showGridColor"
        :draw="drawGridCanvas"
        @set-pixels="setPixels"
        @clear="clear"
      />

      <CardFooterSettingsTabs
        :node-id="nodeId"
        v-model:active-tab-index="config.activeTabIndex"
        extra-tab-label="Editor"
      >
        <template #settings>

          <div class="section">
            <div class="hstack">
              <NumberInput
                :id="`${nodeId}-tile-size`"
                label="Tile Size"
                v-model="config.tileSize"
                :step="1"
                :min="1"
                input-width="50px"
                class="me-auto"
              />
            </div>
          </div>
          <div class="section">
            <div class="hstack">

              <div class="form-label col-form-label text-end pe-2 section-heading-text">
                Edge Variants

              </div>

              <NumberInput
                :id="`${nodeId}-verticalEdgeValueCount`"
                label="Vertical"
                v-model="config.verticalEdgeValueCount"
                :step="1"
                :min="1"
                input-width="50px"
                class="me-2"
              />

              <NumberInput
                :id="`${nodeId}-horizontalEdgeValueCount`"
                label="Horizontal"
                v-model="config.horizontalEdgeValueCount"
                :step="1"
                :min="1"
                input-width="50px"
              />
            </div>
          </div>

        </template>

        <template #extra>
          <div class="section">

            <RangeSlider
              :id="`${nodeId}-tile-copy-margin`"
              label="Tile Copy Margin"
              v-model:value="config.tileMarginCopySize"
              :min="1"
              :max="50"
              :step="1"
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
                <span class="material-symbols-outlined">square</span>
              </button>
              <button
                @click="brushShape = 'circle'"
                :class="['btn btn-sm', brushShape === 'circle' ? 'btn-primary' : 'btn-outline-primary']"
                title="Circle Brush"
              >
                <span class="material-symbols-outlined">circle</span>
              </button>
            </div>

            <div class="btn-group mx-2" role="group">
              <button
                @click="brushMode = 'add'"
                :class="['btn btn-sm', brushMode === 'add' ? 'btn-primary' : 'btn-outline-primary']"
                title="Add"
              >
                <span class="material-symbols-outlined">ink_highlighter</span>
              </button>
              <button
                @click="brushMode = 'remove'"
                :class="['btn btn-sm', brushMode === 'remove' ? 'btn-primary' : 'btn-outline-primary']"
                title="Remove"
              >
                <span class="material-symbols-outlined">ink_eraser</span>
              </button>
            </div>

            <button
              role="button"
              @click="canvasPaintRef?.clearCanvas()"
              class="btn btn-danger btn-sm ms-2"
            >
              Clear Canvas
            </button>

          </div>
        </template>
        <template #display-options>

          <div class="section">
            <CheckboxColorList :items="canvasDrawCheckboxColors(config)" />
          </div>
        </template>

      </CardFooterSettingsTabs>
    </template>
  </NodeCard>
</template>
<style lang="scss">
.canvas-tile-container {
  width: calc(var(--node-img-width, 150px) * var(--node-img-scale, 1));
  height: calc(var(--node-img-width, 150px) * var(--node-img-scale, 1));
}
</style>