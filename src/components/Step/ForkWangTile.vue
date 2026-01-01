<script lang="ts">
import { NodeType } from '../../lib/pipeline/Node.ts'
import type { AnyStepMeta } from '../../lib/pipeline/StepMeta.ts'
import { PassThrough } from '../../lib/step-data-types/PassThrough.ts'

export const STEP_META: AnyStepMeta = {
  type: NodeType.FORK,
  def: 'fork_wang_tiles',
  displayName: 'Fork: Wang Tiles',
  inputDataTypes: [],
  outputDataType: PassThrough,
}
</script>
<script setup lang="ts">
import { reactive } from 'vue'
import type { NodeId } from '../../lib/pipeline/Node.ts'
import { useForkHandler } from '../../lib/pipeline/useStepHandler.ts'
import { BitMask } from '../../lib/step-data-types/BitMask.ts'
import { prng } from '../../lib/util/prng.ts'
import StepCard from '../StepCard.vue'
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
  async run({ config, branchIndex }) {

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
const config = node.config

</script>
<template>
  <StepCard
    :node="node"
    :show-add-node-btn="false"
    :copyable="false"
    :draggable="false"
    :mutable="false"
  >
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
          :min="0"
          :max="config.size.value"
          v-model:min-value="config.minGapSize"
          v-model:max-value="config.maxGapSize"
        />

        <RangeBandSlider
          :id="`${nodeId}-chunk-size`"
          label="Chunk Size"
          :min="0"
          :max="config.size.value"
          v-model:min-value="config.minChunkSize"
          v-model:max-value="config.maxChunkSize"
        />

        <RangeSlider
          :id="`${nodeId}-padding`"
          label="Padding"
          v-model:value="config.padding"
          :min="0"
          :max="Math.floor(config.size.value * 0.5)"
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