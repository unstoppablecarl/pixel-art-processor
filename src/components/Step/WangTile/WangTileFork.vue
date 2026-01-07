<script lang="ts">
import type { AnyStepMeta } from '../../../lib/pipeline/_types.ts'
import { NodeType } from '../../../lib/pipeline/_types.ts'
import { BitMask } from '../../../lib/step-data-types/BitMask.ts'
import { STEP_META as branchStepMeta } from '../Branch.vue'

export interface IStepMeta {
  wangTileInfo?: {
    sideIds: string[],
    N: string,
    S: string,
    W: string,
    E: string,
  }
}

export const STEP_META: AnyStepMeta = {
  type: NodeType.FORK,
  def: 'fork_wang_tiles',
  displayName: 'Fork: Wang Tiles',
  inputDataTypes: [],
  outputDataType: BitMask,
  branchDefs: [branchStepMeta.def],
}
</script>
<script setup lang="ts">
import { computed } from 'vue'
import type { NodeId } from '../../../lib/pipeline/_types.ts'
import { useForkHandler } from '../../../lib/pipeline/useStepHandler.ts'
import { usePipelineStore } from '../../../lib/store/pipeline-store.ts'
import type { BinaryArray } from '../../../lib/util/prng/binary-array-chunks.ts'
import { deepUnwrap, shallowArrayItemsRef } from '../../../lib/util/vue-util.ts'
import {
  makeBitMaskFromWangTile,
  makeWangTileEdgeConfigDefaults,
  type WangTileEdgeConfig,
} from '../../../lib/wang-tiles/wang-tile-vue-helpers.ts'
import { populateIndexedWangTile, WangTileset } from '../../../lib/wang-tiles/WangTileset.ts'
import StepCard from '../../Card/StepCard.vue'
import StepImage from '../../StepImage.vue'
import { rangeSliderConfig } from '../../UIForms/RangeSlider.ts'
import RangeSlider from '../../UIForms/RangeSlider.vue'
import ForkWangTileEdge from '../../StepSupport/ForkWangTileEdge.vue'

const { nodeId } = defineProps<{ nodeId: NodeId }>()

const CONFIG_DEFAULTS = {
  size: rangeSliderConfig({
    value: 64,
    min: 8,
    max: 512,
  }),
}

const node = useForkHandler(nodeId, {
  ...STEP_META,
  config() {
    return {
      ...CONFIG_DEFAULTS,
      wangTiles: [] as WangTileEdgeConfig[],
    }
  },
  watcherTargets(n) {
    return [
      {
        name: 'size',
        target: () => n.config.size,
      },
      {
        name: 'seed',
        target: () => n.seed,
      },
    ]
  },
  async run({ config, branchIndex }) {
    if (branchIndex > tileset.value.tiles.length - 1) {
      return {
        validationErrors: [
          `cannot generate data for Branch ${branchIndex + 1}. There are only ${tileset.value.tiles.length} tile combinations.`,
        ],
      }
    }

    const wangTile = wangTileForBranch(branchIndex)
    const mask = makeBitMaskFromWangTile(config.size.value, wangTile)

    return {
      output: mask,
      preview: mask.toImageData(),
      meta: {
        wangTile,
      },
    }
  },
})
const config = node.config

function wangTileForBranch(branchIndex: number) {
  const indexedWangTile = tileset.value.tiles[branchIndex]
  return populateIndexedWangTile(indexedWangTile, edges.value)
}

const edges = shallowArrayItemsRef<BinaryArray>([])

const tileset = computed(() => {
  const edgeIndexes = Array.from(edges.value.keys())
  return WangTileset.createFromColors<number>(edgeIndexes)
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

  const tiles = tileset.value.tilesWithEdge(edgeIndex)
  const affectedBranchIndexes = tiles.map(t => tileset.value.tiles.indexOf(t))

  affectedBranchIndexes.forEach(bIndex => {
    if (node.branchIds.value[bIndex]) {
      node.markBranchDirty(store, bIndex)
    }
  })
}
</script>
<template>
  <StepCard
    :node="node"
    :show-add-node-btn="false"
    :copyable="false"
    :draggable="false"
    :mutable="false"
  >
    <template #body v-if="!config.wangTiles.length">
      <StepImage :image-data="null" />
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

          <div class="hstack gap-2">
            <div>
              <strong>Edges:</strong> {{ config.wangTiles.length }}
            </div>
            <div>
              <strong>Tiles:</strong> {{ Math.pow(config.wangTiles.length, 4) }}
            </div>
          </div>
        </div>
      </div>
      <template v-for="(_item, index) in config.wangTiles">
        <ForkWangTileEdge
          :node-id="nodeId"
          :size="config.size.value"
          :index="index"
          v-model:config="config.wangTiles[index]"
          :edge="edges[index]"
          @update:edge="updateEdge(index, $event)"
          @remove="remove(index)"
          @duplicate="duplicate(index)"
        />

      </template>
      <div class="card-footer border-top-0">
        <div class="section hstack">
          <button role="button" class="btn btn-success ms-auto" @click="add()">Add</button>
        </div>
      </div>
    </template>
  </StepCard>
</template>