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
import { reactive, computed, watch } from 'vue'
import type { NodeId } from '../../lib/pipeline/_types.ts'
import { useForkHandler } from '../../lib/pipeline/useStepHandler.ts'
import { usePipelineStore } from '../../lib/store/pipeline-store.ts'
import { prng } from '../../lib/util/prng.ts'
import { calculateChunkedArrayValidRanges } from '../../lib/util/prng/binary-array-chunks.ts'
import type { StepImg } from '../../lib/util/vue-util.ts'
import StepCard from '../StepCard.vue'
import StepImage from '../StepImage.vue'
import SeedPopOver from '../UI/SeedPopOver.vue'
import CheckBoxInput from '../UIForms/CheckBoxInput.vue'
import NumberInput from '../UIForms/NumberInput.vue'
import RangeBandSlider from '../UIForms/RangeBandSlider.vue'
import { rangeSliderConfig } from '../UIForms/RangeSlider.ts'
import RangeSlider from '../UIForms/RangeSlider.vue'

const { nodeId } = defineProps<{ nodeId: NodeId }>()

const CONFIG_DEFAULTS = {
  size: rangeSliderConfig({
    value: 64,
    min: 8,
    max: 512,
  }),
  chunks: rangeSliderConfig({
    value: 7,
    min: 1,
    max: 30,
  }),
  shuffleSeed: 0,

  invert: false,
  minGapSize: 3,
  maxGapSize: 13,
  minChunkSize: 3,
  maxChunkSize: 13,
  padding: 4,
}

const node = useForkHandler(nodeId, {
  ...STEP_META,
  config() {
    return reactive({ ...CONFIG_DEFAULTS })
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

// Compute valid ranges reactively
const validRanges = computed(() => {
  return calculateChunkedArrayValidRanges(
    config.size.value,
    config.chunks.value,
    config.minGapSize,
    config.maxGapSize,
    config.minChunkSize,
    config.maxChunkSize,
    config.padding,
  )
})

// Clamp values when they go out of valid range
watch(validRanges, (ranges) => {
  // Clamp padding
  if (config.padding < ranges.padding.min) {
    config.padding = ranges.padding.min
  } else if (config.padding > ranges.padding.max) {
    config.padding = ranges.padding.max
  }

  // Clamp minChunkSize
  if (config.minChunkSize < ranges.minChunkSize.min) {
    config.minChunkSize = ranges.minChunkSize.min
  } else if (config.minChunkSize > ranges.minChunkSize.max) {
    config.minChunkSize = ranges.minChunkSize.max
  }

  // Clamp maxChunkSize
  if (config.maxChunkSize < ranges.maxChunkSize.min) {
    config.maxChunkSize = ranges.maxChunkSize.min
  } else if (config.maxChunkSize > ranges.maxChunkSize.max) {
    config.maxChunkSize = ranges.maxChunkSize.max
  }

  // Clamp minGapSize
  if (config.minGapSize < ranges.minGapSize.min) {
    config.minGapSize = ranges.minGapSize.min
  } else if (config.minGapSize > ranges.minGapSize.max) {
    config.minGapSize = ranges.minGapSize.max
  }

  // Clamp maxGapSize
  if (config.maxGapSize < ranges.maxGapSize.min) {
    config.maxGapSize = ranges.maxGapSize.min
  } else if (config.maxGapSize > ranges.maxGapSize.max) {
    config.maxGapSize = ranges.maxGapSize.max
  }
}, { deep: true })
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

    <template #footer>
      <div class="section">

        <RangeSlider
          :id="`${nodeId}-size`"
          label="Size"
          :defaults="CONFIG_DEFAULTS.size"
          v-model:value="config.size.value"
          v-model:min="config.size.min"
          v-model:max="config.size.max"
          v-model:step="config.size.step"
        />

        <RangeBandSlider
          :id="`${nodeId}-gap-size`"
          label="Gap Size"
          :min="validRanges.minGapSize.min"
          :max="validRanges.maxGapSize.max"
          v-model:min-value="config.minGapSize"
          v-model:max-value="config.maxGapSize"
        />

        <RangeBandSlider
          :id="`${nodeId}-chunk-size`"
          label="Chunk Size"
          :min="validRanges.minChunkSize.min"
          :max="validRanges.maxChunkSize.max"
          v-model:min-value="config.minChunkSize"
          v-model:max-value="config.maxChunkSize"
        />

        <RangeSlider
          :id="`${nodeId}-padding`"
          label="Padding"
          v-model:value="config.padding"
          :min="validRanges.padding.min"
          :max="validRanges.padding.max"
          :step="1"
        />

        <CheckBoxInput
          :id="`${nodeId}-invert`"
          label="Invert"
          v-model="config.invert"
        />

        <RangeSlider
          :id="`${nodeId}-chunks`"
          label="Chunks"
          :defaults="CONFIG_DEFAULTS.chunks"
          v-model:value="config.chunks.value"
          v-model:min="config.chunks.min"
          v-model:max="config.chunks.max"
          v-model:step="config.chunks.step"
        />

        <NumberInput
          :id="`${nodeId}-chunks-shuffle`"
          label="Shuffle Seed"
          :step="1"
          :min="0"
          v-model="config.shuffleSeed"
          input-width="50%"
        />
      </div>
    </template>
  </StepCard>
</template>