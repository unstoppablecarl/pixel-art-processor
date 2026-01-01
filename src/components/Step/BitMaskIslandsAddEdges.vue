<script lang="ts">
import { NodeType } from '../../lib/pipeline/Node.ts'
import type { AnyStepMeta } from '../../lib/pipeline/StepMeta.ts'
import { BitMask } from '../../lib/step-data-types/BitMask.ts'

export const STEP_META: AnyStepMeta = {
  type: NodeType.STEP,
  def: 'bitmask_islands_add_edges',
  displayName: 'BitMask Islands: Add Edges',
  inputDataTypes: [],
  outputDataType: BitMask,
}
</script>
<script setup lang="ts">
import { computed } from 'vue'
import type { NodeId } from '../../lib/pipeline/Node.ts'
import { useStepHandler } from '../../lib/pipeline/useStepHandler.ts'
import { prng } from '../../lib/util/prng.ts'
import StepCard from '../StepCard.vue'
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
  verticalChunks: rangeSliderConfig({
    value: 7,
    min: 0,
    max: 30,
  }),
  horizontalChunks: rangeSliderConfig({
    value: 7,
    min: 1,
    max: 30,
  }),
  horizontalShuffleSeed: 0,
  verticalShuffleSeed: 0,

  invertHorizontal: false,
  invertVertical: false,
  minGapSize: 3,
  maxGapSize: 13,
  minChunkSize: 3,
  maxChunkSize: 13,
  padding: 4,
}

const node = useStepHandler(nodeId, {
  ...STEP_META,
  config() {
    return {
      ...CONFIG_DEFAULTS,
    }
  },
  async run({ config }) {
    const size = config.size
    const mask = new BitMask(size.value, size.value)

    const options = {
      length: size.value,

      minGapSize: config.minGapSize,
      maxGapSize: config.maxGapSize,
      minChunkSize: config.minChunkSize,
      maxChunkSize: config.maxChunkSize,
      padding: config.padding,
    }

    const verticalChunks = prng.generateChunkedBinaryArray({
      chunks: config.verticalChunks.value,
      shuffleSeed: config.verticalShuffleSeed,
      ...options,
    })

    verticalChunks.forEach((v, i) => {
      if (!v === config.invertVertical) {
        mask.set(0, i, 1)
        mask.set(size.value - 1, i, 1)
      }
    })

    const horizontalChunks = prng.generateChunkedBinaryArray({
      chunks: config.horizontalChunks.value,
      shuffleSeed: config.horizontalShuffleSeed,
      ...options,
    })

    horizontalChunks.forEach((v, i) => {
      if (!v === config.invertHorizontal) {
        mask.set(i, 0, 1)
        mask.set(i, size.value - 1, 1)
      }
    })

    return {
      output: mask,
      preview: mask.toImageData(),
    }
  },
})

const config = node.config!

const computedSize = computed(() => config.size.value)
</script>
<template>
  <StepCard :node="node" show-dimensions>
    <template #body>
      {{ node.outputData }}


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
          :min="0"
          :max="computedSize"
          v-model:min-value="config.minGapSize"
          v-model:max-value="config.maxGapSize"
        />

        <RangeBandSlider
          :id="`${nodeId}-chunk-size`"
          label="Chunk Size"
          :min="0"
          :max="computedSize"
          v-model:min-value="config.minChunkSize"
          v-model:max-value="config.maxChunkSize"
        />

        <RangeSlider
          :id="`${nodeId}-padding`"
          label="Padding"
          v-model:value="config.padding"
          :min="0"
          :max="Math.floor(config.size.value * 0.4)"
          :step="1"
        />

      </div>
      <div class="section">
        <div class="section-heading-container hstack">
          <div class="section-heading-text">
            Horizontal
          </div>
          <div class="form-check ms-auto">
            <input type="checkbox" class="form-check-input" v-model="config.invertHorizontal" />
            <label class="form-check-label">Invert</label>
          </div>
        </div>

        <RangeSlider
          :id="`${nodeId}-horizontal-chunks`"
          label="Horizontal Chunks"
          :defaults="CONFIG_DEFAULTS.horizontalChunks"
          v-model:value="config.horizontalChunks.value"
          v-model:min="config.horizontalChunks.min"
          v-model:max="config.horizontalChunks.max"
          v-model:step="config.horizontalChunks.step"
        />

        <NumberInput
          :id="`${nodeId}-horizontal-chunks-shuffle`"
          label="Shuffle Seed"
          :step="1"
          :min="0"
          v-model="config.horizontalShuffleSeed"
          input-width="50%"
        />
      </div>
      <div class="section">
        <div class="section-heading-container hstack">
          <div class="section-heading-text">
            Vertical
          </div>
          <div class="form-check ms-auto">
            <input type="checkbox" class="form-check-input" v-model="config.invertVertical" />
            <label class="form-check-label">Invert</label>
          </div>
        </div>

        <RangeSlider
          :id="`${nodeId}-vertical-chunks`"
          label="Vertical Chunks"
          :defaults="CONFIG_DEFAULTS.verticalChunks"
          v-model:value="config.verticalChunks.value"
          v-model:min="config.verticalChunks.min"
          v-model:max="config.verticalChunks.max"
          v-model:step="config.verticalChunks.step"
        />

        <NumberInput
          :id="`${nodeId}-vertical-chunks-shuffle`"
          label="Shuffle Seed"
          :step="1"
          :min="0"
          v-model="config.verticalShuffleSeed"
          input-width="50%"

        />
      </div>
    </template>
  </StepCard>
</template>