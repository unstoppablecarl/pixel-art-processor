<script lang="ts">
import type { AnyStepMeta } from '../../lib/pipeline/_types.ts'
import { NodeType } from '../../lib/pipeline/_types.ts'
import { BitMask } from '../../lib/step-data-types/BitMask.ts'

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
}
</script>
<script setup lang="ts">
import { BCollapse } from 'bootstrap-vue-next'
import { computed } from 'vue'
import type { NodeId } from '../../lib/pipeline/_types.ts'
import { useForkHandler } from '../../lib/pipeline/useStepHandler.ts'
import { usePipelineStore } from '../../lib/store/pipeline-store.ts'
import { prng } from '../../lib/util/prng.ts'
import type { StepImg } from '../../lib/util/vue-util.ts'
import {
  generateWangTileEdgePattern,
  makeWangTileConfigDefaults,
  type WangTileColorConfig,
} from '../../lib/wang-tiles/wang-tile-vue-helpers.ts'
import { WangTileset } from '../../lib/wang-tiles/WangTileset.ts'
import StepCard from '../StepCard.vue'
import StepImage from '../StepImage.vue'
import ForkWangTileEdgeColor from '../StepSupport/ForkWangTileEdgeColor.vue'
import SeedPopOver from '../UI/SeedPopOver.vue'
import { rangeSliderConfig } from '../UIForms/RangeSlider.ts'
import RangeSlider from '../UIForms/RangeSlider.vue'

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
      wangTiles: [] as WangTileColorConfig[],
    }
  },
  async run({ config, branchIndex, branchGenerationSeed }) {

    prng.setSeed(branchGenerationSeed)

    const size = config.size.value
    const options = {
      length: config.size.value,
      minGapSize: config.minGapSize,
      maxGapSize: config.maxGapSize,
      minChunkSize: config.minChunkSize,
      maxChunkSize: config.maxChunkSize,
      padding: config.padding,
    }

    const mask = new BitMask(size, size)
    const edgeSetters = {
      setLeftEdge: (i: number) => mask.set(0, i, 1),
      setRightEdge: (i: number) => mask.set(size - 1, i, 1),
      setTopEdge: (i: number) => mask.set(i, 0, 1),
      setBottomEdge: (i: number) => mask.set(i, size - 1, 1),
    }

    const edges = Object.values(edgeSetters)

    const chunks = prng.generateChunkedBinaryArray({
      chunks: config.chunks.value,
      shuffleSeed: config.shuffleSeed,
      ...options,
    })

    chunks.forEach((v, i) => {
      if (!v === config.invert) {
        edges[branchIndex % 4](i)
      }
    })

    return {
      output: mask,
      preview: mask.toImageData(),
    }
  },
})

const store = usePipelineStore()
const outputDataRef = store.getFork(node.id).forkOutputData
const images = computed((): StepImg[] => {
  return outputDataRef.value.map(({ preview, validationErrors }, index) => {
    return {
      imageData: preview,
      label: `Branch: ${index + 1}`,
      validationErrors,
    }
  })
})

const setBranchSeed = (index: number, seed: number) => node.setBranchGenerationSeed(store, index, seed)
const getBranchSeed = (index: number) => node.getBranchGenerationSeed(store, index)

const config = node.config

function add() {
  node.config.wangTiles.push(makeWangTileConfigDefaults())
}

function remove(index: number) {
  node.config.wangTiles.splice(index, 1)
}
</script>
<template>
  <StepCard
    :node="node"
    :images="images"
    :show-add-node-btn="false"
    :copyable="false"
    :draggable="false"
    :mutable="false"
  >
    <template #body v-if="!images.length">
      <StepImage :image-data="null" />
    </template>

    <template #label="{label, index}">
      {{ label }}
      <SeedPopOver
        label="Generator"
        :model-value="getBranchSeed(index)"
        @update:model-value="setBranchSeed(index, $event)"
      />
    </template>

    <template #body-and-footer>
      <div class="card-footer">
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
        </div>
      </div>
      <template v-for="(item, branchIndex) in config.wangTiles">
        <div class="card-header">
          <div class="section-heading-container hstack">
            <span class="section-heading-text">
              Wang Edge: {{ branchIndex + 1 }}
            </span>
            <button role="button" class="btn btn-xs btn-danger ms-auto" @click="remove(branchIndex)">
              <span class="material-symbols-outlined">delete</span>
            </button>
            <button
              role="button"
              :class="'btn btn-collapse btn-transparent btn-xs ms-1 ' + (item.visible ? null : 'collapsed')"
              :aria-expanded="item.visible ? 'true' : 'false'"
              @click="item.visible = !item.visible"
            />
          </div>
        </div>
        <BCollapse
          v-model="item.visible"
          lazy
        >
          <div class="card-body">
            <StepImage :image-data="outputDataRef?.[branchIndex]?.preview ?? null" />
          </div>
          <div class="card-footer">
            <div class="section">

              <ForkWangTileEdgeColor
                :chunks="item.chunks"
                :shuffle-seed="item.shuffleSeed"
                :invert="item.invert"
                :min-gap-size="item.minGapSize"
                :max-gap-size="item.maxGapSize"
                :min-chunk-size="item.minChunkSize"
                :max-chunk-size="item.maxChunkSize"
                :padding="item.padding"
                :node-id="nodeId"
                :size="config.size.value"
                :branch-index="branchIndex"
              />
            </div>

          </div>
        </BCollapse>

      </template>
      <div class="card-footer">
        <div class="section hstack">
          <button role="button" class="btn btn-success ms-auto" @click="add()">Add</button>
        </div>
      </div>
    </template>
  </StepCard>
</template>