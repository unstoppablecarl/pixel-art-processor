<script lang="ts">
import { BitMask } from '../../../lib/node-data-types/BitMask.ts'
import { type NodeDef, NodeType } from '../../../lib/pipeline/_types.ts'
import { defineFork } from '../../../lib/pipeline/types/definitions.ts'
import type { WangTile } from '../../../lib/wang-tiles/WangTileset.ts'
import { STEP_META as branchStepMeta } from './WangTileBranch.vue'

export interface IRunnerResultMeta {
  wangTileInfo?: WangTile<number>
}

export const STEP_META = defineFork({
  type: NodeType.FORK,
  def: 'fork_wang_tiles' as NodeDef,
  displayName: 'Wang Tile | Fork',
  noInput: true,
  outputDataType: BitMask,
  branchDefs: [branchStepMeta.def],
})
</script>
<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import type { NodeId } from '../../../lib/pipeline/_types.ts'
import { defineForkHandler, useForkHandler } from '../../../lib/pipeline/NodeHandler/ForkHandler.ts'
import { PixelMap } from '../../../lib/node-data-types/PixelMap.ts'
import { usePipelineStore } from '../../../lib/store/pipeline-store.ts'
import { arrayIndexToColor } from '../../../lib/util/data/color.ts'
import type { BinaryArray } from '../../../lib/util/prng/binary-array-chunks.ts'
import { deepUnwrap, shallowArrayItemsRef } from '../../../lib/util/vue-util.ts'
import {
  makeBitMaskFromWangTile,
  makeWangTileEdgeConfigDefaults, renderImageEdgeChunks,
  type WangTileEdgeConfig,
} from '../../../lib/wang-tiles/wang-tile-vue-helpers.ts'
import {
  populateIndexedWangTile, type TileWithEligibleEdges,
  WangTileset,
} from '../../../lib/wang-tiles/WangTileset.ts'
import NodeCard from '../../Card/NodeCard.vue'
import NodeImage from '../../NodeImage.vue'
import CheckBoxInput from '../../UIForms/CheckBoxInput.vue'
import { rangeSliderConfig } from '../../UIForms/RangeSlider.ts'
import RangeSlider from '../../UIForms/RangeSlider.vue'
import ForkWangTileEdge from '../../NodeSupport/ForkWangTileEdge.vue'

const { nodeId } = defineProps<{ nodeId: NodeId }>()

const CONFIG_DEFAULTS = {
  size: rangeSliderConfig({
    value: 64,
    min: 8,
    max: 512,
  }),
}

const handler = defineForkHandler(STEP_META, {
  config() {
    return {
      ...CONFIG_DEFAULTS,
      wangTiles: [] as WangTileEdgeConfig[],
      showEdgeColors: true,
    }
  },
  watcherTargets(n) {
    return [
      {
        name: 'size',
        target: () => n.config.size,
      },
      {
        name: 'showEdgeColors',
        target: () => n.config.showEdgeColors,
      },
      n.seedWatcherTarget(),
    ]
  },
  async run({ config, branchIndex }) {
    if (branchIndex > indexedTileset.value.tiles.length - 1) {
      return {
        validationErrors: [
          `cannot generate data for Branch ${branchIndex + 1}. There are only ${indexedTileset.value.tiles.length} tile combinations.`,
        ],
      }
    }

    const wangTile = wangTileForBranch(branchIndex)
    const mask = makeBitMaskFromWangTile(config.size.value, wangTile)

    let preview: ImageData | null
    if (config.showEdgeColors) {
      preview = makePreviewFromWangTile(config.size.value, wangTile).toImageData()
    } else {
      preview = mask.toImageData()
    }

    return {
      output: mask,
      preview,
      meta: {
        wangTileEdges: edges,
        wangTileInfo: indexedTileset.value.tiles[branchIndex],
      },
    }
  },
})
const node = useForkHandler(nodeId, handler)

const config = node.config

function makePreviewFromWangTile(size: number, tile: WangTile<BinaryArray>) {
  const mask = new PixelMap(size, size)
  const nIndex = edges.value.indexOf(tile.edges.N)
  const eIndex = edges.value.indexOf(tile.edges.E)
  const sIndex = edges.value.indexOf(tile.edges.S)
  const wIndex = edges.value.indexOf(tile.edges.W)

  const length = edges.value.length
  renderImageEdgeChunks(mask, 'N', tile.edges.N, arrayIndexToColor(nIndex, length))
  renderImageEdgeChunks(mask, 'E', tile.edges.E, arrayIndexToColor(eIndex, length))
  renderImageEdgeChunks(mask, 'S', tile.edges.S, arrayIndexToColor(sIndex, length))
  renderImageEdgeChunks(mask, 'W', tile.edges.W, arrayIndexToColor(wIndex, length))
  return mask
}

function wangTileForBranch(branchIndex: number) {
  const indexedWangTile = indexedTileset.value.tiles[branchIndex]
  return populateIndexedWangTile(indexedWangTile, edges.value)
}

const edges = shallowArrayItemsRef<BinaryArray>([])

const tileCount = ref(0)

const indexedTileset = computed(() => {
  const items: TileWithEligibleEdges<number>[] = edges.value.map((t, i) => {
    const {
      eligibleForN,
      eligibleForE,
      eligibleForS,
      eligibleForW,
    } = node.config.wangTiles[i]

    return {
      edgeValue: i,
      eligibleForN,
      eligibleForE,
      eligibleForS,
      eligibleForW,
    }
  })

  const result = WangTileset.createFromLimitedEdges<number>(items)
  tileCount.value = result.tiles.length
  return result
})

function add() {
  node.config.wangTiles.push(makeWangTileEdgeConfigDefaults())
}

function duplicate(edgeIndex: number) {
  const copy = structuredClone(deepUnwrap(node.config.wangTiles[edgeIndex]))
  node.config.wangTiles.splice(edgeIndex + 1, 0, copy)
}

function remove(edgeIndex: number) {
  node.config.wangTiles.splice(edgeIndex, 1)
  edges.value.splice(edgeIndex, 1)
}

const store = usePipelineStore()

function updateEdge(edgeIndex: number, value: BinaryArray | undefined) {
  if (!value) return
  edges.value[edgeIndex] = value

  const tiles = indexedTileset.value.tilesWithEdge(edgeIndex)
  const affectedBranchIndexes = tiles.map(t => indexedTileset.value.tiles.indexOf(t))

  affectedBranchIndexes.forEach(bIndex => {
    if (node.branchIds.value[bIndex]) {
      node.markBranchDirty(store, bIndex)
    }
  })
}

watchEffect(() => {
  node.maxBranchCount.value = tileCount.value
})
</script>
<template>
  <NodeCard
    :node="node"
    :show-add-node-btn="false"
    :copyable="false"
    :draggable="false"
    :mutable="false"
  >
    <template #body v-if="!config.wangTiles.length">
      <NodeImage :image-data="null" />
    </template>

    <template #body-and-footer>
      <div class="card-footer border-top-0">
        <div class="section section-divider">
          <RangeSlider
            :id="`${nodeId}-size`"
            label="Size"
            :defaults="CONFIG_DEFAULTS.size"
            v-model:value="config.size.value"
            v-model:min="config.size.min"
            v-model:max="config.size.max"
            v-model:step="config.size.step"
          />

          <CheckBoxInput :id="`${nodeId}-show-edge-colors`" label="Show Edge Colors" v-model="config.showEdgeColors" />
          <div class="hstack gap-2">
            <div>
              <strong>Edges:</strong> {{ config.wangTiles.length }}
            </div>
            <div>
              <strong>Tiles:</strong> {{ tileCount }}
            </div>
          </div>
        </div>
      </div>
      <template v-for="index in config.wangTiles.length">
        <ForkWangTileEdge
          :node-id="nodeId"
          :size="config.size.value"
          :color="arrayIndexToColor(index, config.wangTiles.length)"
          :index="index-1"
          v-model:config="config.wangTiles[index-1]"
          :edge="edges[index-1]"
          @update:edge="updateEdge(index-1, $event)"
          @remove="remove(index-1)"
          @duplicate="duplicate(index-1)"
        />

      </template>
      <div class="card-footer border-top-0">
        <div class="section hstack">
          <button role="button" class="btn btn-success ms-auto" @click="add()">Add</button>
        </div>
      </div>
    </template>
  </NodeCard>
</template>