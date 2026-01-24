<script lang="ts">
import { BitMask } from '../../../lib/node-data-types/BitMask.ts'
import { type NodeDef, NodeType } from '../../../lib/pipeline/_types.ts'
import { defineStep } from '../../../lib/pipeline/types/definitions.ts'
import { nodeUsesSidebar } from '../../../lib/vue/useSidebar.ts'

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
  markRaw, onMounted,
  type Raw, type Reactive,
  ref,
  useTemplateRef, watch, watchEffect,
} from 'vue'
import type { NodeId } from '../../../lib/pipeline/_types.ts'
import { defineStepHandler, useStepHandler } from '../../../lib/pipeline/NodeHandler/StepHandler.ts'
import { usePipelineStore } from '../../../lib/store/pipeline-store.ts'
import {
  type SerializedImageData, serializeImageData,
} from '../../../lib/util/html-dom/ImageData.ts'
import { handleNodeConfigHMR } from '../../../lib/util/vite.ts'
import { reactiveFromRefs } from '../../../lib/util/vue-util.ts'
import { canvasDrawCheckboxColors, DEFAULT_SHOW_CURSOR, DEFAULT_SHOW_GRID } from '../../../lib/vue/canvas-draw-ui.ts'
import { imageDataRef, tilesetSyncedImageDataRef } from '../../../lib/vue/vue-image-data.ts'

import { makeAxialEdgeWangTileManager } from '../../../lib/wang-tiles/AxialEdgeWangTileManager.ts'
import {
  createAxialEdgeWangTileset,
  type TileId,
  type WangTile,
} from '../../../lib/wang-tiles/WangTileset.ts'
import CanvasPaint from '../../CanvasPaint.vue'
import TileCanvas from '../../CanvasPaint/components/TileCanvas.vue'
import TileGridCanvas from '../../CanvasPaint/components/TileGridCanvas.vue'
import { makeLocalToolManager } from '../../CanvasPaint/LocalToolManager.ts'

import NodeCard from '../../Card/NodeCard.vue'
import CardFooterSettingsTabs from '../../UI/CardFooterSettingsTabs.vue'
import CheckboxColorList from '../../UIForms/CheckboxColorList.vue'
import NumberInput from '../../UIForms/NumberInput.vue'
import RangeSlider from '../../UIForms/RangeSlider.vue'

nodeUsesSidebar()
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
  onAdded() {
    nodeUsesSidebar()
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
// const color = computed(() => brushMode.value === BrushMode.ADD ? parseColor('#fff') : { r: 0, g: 0, b: 0, a: 0 })

const tilesetManager = makeAxialEdgeWangTileManager(
  tileset,
  tileSize,
)

const localToolManger = makeLocalToolManager({
  tilesetImageRefs,
  tilesetManager,
  onSyncTile(tile, imageData) {
    config.wangTiles[tile.id] = {
      tile: tileset.value.byId.get(tile.id)!,
      imageData: serializeImageData(imageData),
    }
  },
})

function sync() {
  localToolManger.state.tileSize = tileSize.value
  localToolManger.state.scale = store.imgScale
  localToolManger.gridRenderer.queueRender()
  localToolManger.gridRenderer.resize()
  localToolManger.state.gridTilesWidth = tilesetManager.tileGrid.value.width
  localToolManger.state.gridTilesHeight = tilesetManager.tileGrid.value.height
  localToolManger.gridRenderer.queueRenderTiles()
}

watchEffect(() => sync())
onMounted(() => sync())
</script>
<template>
  <NodeCard
    :node="node"
    :images="[]"
    :img-columns="4"
  >
    <template #body>
      <div class="canvas-tile-container" v-for="item in tileset.tiles" :key="item.id">
        <TileCanvas
          :tile-id="item.id"
          :local-tool-manager="localToolManger"
        />
      </div>
    </template>
    <template #footer>
      <TileGridCanvas
        :local-tool-manager="localToolManger"
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