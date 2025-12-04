<script lang="ts">
import type { StepMeta } from '../../lib/pipeline/StepMeta.ts'

export const STEP_META: StepMeta = {
  def: 'bitmask_island_edges',
  displayName: 'BitMask Add Edge Islands',
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
    value: 3,
    min: 0,
    max: 30,
  }),
  horizontalChunks: rangeSliderConfig({
    value: 3,
    min: 1,
    max: 30,
  }),
  minChunkSize: 3,
  maxChunkSize: 5,
  padding: 4,
}

const step = useStepHandler(stepId, {
  ...STEP_META,
  config() {

    console.log(CONFIG_DEFAULTS)
    return reactive({
      ...CONFIG_DEFAULTS,
    })
  },
  run({ config }) {
    const size = config.size
    const mask = new BitMask(size.value, size.value)
    // mask.setRect(10, 0, 8, 1, 1)
    // mask.setRect(0, 15, 1, 17, 1)
    // mask.setRect(size - 1, 20, 1, 12, 1)
    // mask.setRect(13, size - 1, 18, 1, 1)

    const verticalChunks = prng.generateChunkedBinaryArray(
      size.value,
      config.verticalChunks.value,
      config.minChunkSize,
      config.maxChunkSize,
      config.padding,
    )

    verticalChunks.forEach((v, i) => {
      if (v) {
        mask.set(0, i, 1)
        mask.set(size.value - 1, i, 1)
      }
    })

    const horizontalChunks = prng.generateChunkedBinaryArray(
      size.value,
      config.horizontalChunks.value,
      config.minChunkSize,
      config.maxChunkSize,
      config.padding,
    )

    horizontalChunks.forEach((v, i) => {
      if (v) {
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
      BitMsk Island Edges
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

        <RangeSlider
          :id="`${stepId}-horizontal-chunks`"
          label="Horizontal Chunks"
          :defaults="CONFIG_DEFAULTS.horizontalChunks"
          v-model:value="config.horizontalChunks.value"
          v-model:min="config.horizontalChunks.min"
          v-model:max="config.horizontalChunks.max"
          v-model:step="config.horizontalChunks.step"
        />

        <RangeSlider
          :id="`${stepId}-vertical-chunks`"
          label="Vertical Chunks"
          :defaults="CONFIG_DEFAULTS.verticalChunks"
          v-model:value="config.verticalChunks.value"
          v-model:min="config.verticalChunks.min"
          v-model:max="config.verticalChunks.max"
          v-model:step="config.verticalChunks.step"
        />

        <RangeBandSlider
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