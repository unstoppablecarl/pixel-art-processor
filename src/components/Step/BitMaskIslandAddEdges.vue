<script lang="ts">
import type { StepMeta } from '../../lib/pipeline/StepMeta.ts'

export const STEP_META: StepMeta = {
  def: 'bitmask_island_edges',
  displayName: 'BitMask Add Island Edges',
  inputDataTypes: [],
  outputDataType: BitMask,
}
</script>
<script setup lang="ts">
import { reactive, computed } from 'vue'
import { useStepHandler } from '../../lib/pipeline/useStepHandler.ts'
import { BitMask } from '../../lib/step-data-types/BitMask.ts'
import { prng } from '../../lib/util/prng.ts'
import StepCard from '../StepCard.vue'
import NumberInput from '../UI/NumberInput.vue'
import RangeBandSlider from '../UI/RangeBandSlider.vue'
import { rangeSliderConfig } from '../UI/RangeSlider.ts'
import RangeSlider from '../UI/RangeSlider.vue'

const { stepId } = defineProps<{ stepId: string }>()

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

  invert: false,
  minGapSize: 3,
  maxGapSize: 13,
  minChunkSize: 3,
  maxChunkSize: 13,
  padding: 4,
}

const step = useStepHandler(stepId, {
  ...STEP_META,
  config() {
    return reactive({
      ...CONFIG_DEFAULTS,
    })
  },
  run({ config }) {
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
      if (!v === config.invert) {
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
      if (!v === config.invert) {
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

const config = step.config!

const computedSize = computed(() => config.size.value)
</script>
<template>
  <StepCard :step="step">
    <template #header>
      {{ STEP_META.displayName }}
    </template>
    <template #footer>
      <div>
        <RangeSlider
          :id="`${stepId}-size`"
          label="Size"
          :defaults="CONFIG_DEFAULTS.size"
          v-model:value="config.size.value"
          v-model:min="config.size.min"
          v-model:max="config.size.max"
          v-model:step="config.size.step"
        />

        <div class="form-check">
          <input type="checkbox" class="form-check-input" v-model="config.invert" />
          <label class="form-check-label">Invert</label>
        </div>

        <div class="mb-3">
          <RangeSlider
            :id="`${stepId}-horizontal-chunks`"
            label="Horizontal Chunks"
            :defaults="CONFIG_DEFAULTS.horizontalChunks"
            v-model:value="config.horizontalChunks.value"
            v-model:min="config.horizontalChunks.min"
            v-model:max="config.horizontalChunks.max"
            v-model:step="config.horizontalChunks.step"
          />

          <NumberInput
            :id="`${stepId}-horizontal-chunks-shuffle`"
            label="Shuffle Seed"
            :step="1"
            :min="0"
            v-model="config.horizontalShuffleSeed"
          />
        </div>

        <div class="mb-3">
          <RangeSlider
            :id="`${stepId}-vertical-chunks`"
            label="Vertical Chunks"
            :defaults="CONFIG_DEFAULTS.verticalChunks"
            v-model:value="config.verticalChunks.value"
            v-model:min="config.verticalChunks.min"
            v-model:max="config.verticalChunks.max"
            v-model:step="config.verticalChunks.step"
          />

          <NumberInput
            :id="`${stepId}-vertical-chunks-shuffle`"
            label="Shuffle Seed"
            :step="1"
            :min="0"
            v-model="config.verticalShuffleSeed"
          />
        </div>

        <RangeBandSlider
          :id="`${stepId}-gap-size`"
          label="Gap Size"
          :min="0"
          :max="computedSize"
          v-model:min-value="config.minGapSize"
          v-model:max-value="config.maxGapSize"
        />

        <RangeBandSlider
          :id="`${stepId}-chunk-size`"
          label="Chunk Size"
          :min="0"
          :max="computedSize"
          v-model:min-value="config.minChunkSize"
          v-model:max-value="config.maxChunkSize"
        />

        <RangeSlider
          :id="`${stepId}-padding`"
          label="Padding"
          v-model:value="config.padding"
          :min="0"
          :max="config.size.value * 0.4"
          :step="1"
        />

      </div>
    </template>
  </StepCard>
</template>