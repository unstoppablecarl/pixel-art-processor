<script lang="ts">
import type { StepMeta } from '../../lib/pipeline/StepMeta.ts'

export const STEP_META: StepMeta = {
  def: 'bitmask_add_islands',
  displayName: 'BitMask Add Islands',
  inputDataTypes: [BitMask],
  outputDataType: BitMask,
}

</script>
<script setup lang="ts">
import { shallowReactive } from 'vue'
import { addRandomInnerPoints } from '../../lib/data/PointSet.ts'
import { useStepHandler } from '../../lib/pipeline/useStepHandler.ts'
import { BitMask } from '../../lib/step-data-types/BitMask.ts'
import StepCard from '../StepCard.vue'
import RangeBandSlider from '../UI/RangeBandSlider.vue'

const { stepId } = defineProps<{ stepId: string }>()

const step = useStepHandler(stepId, {
  ...STEP_META,
  config() {
    return shallowReactive({
      minDistance: 4,
      maxDistance: 10,
    })
  },
  run({ config, inputData }) {
    if (!inputData) return

    const mask = inputData as BitMask
    const C = config

    addRandomInnerPoints(mask, C.minDistance, C.maxDistance)

    return {
      output: mask,
      preview: mask.toImageData(),
    }
  },
})

const config = step.config

</script>
<template>
  <StepCard :step="step">
    <template #header>
      BitMask Add Islands
    </template>
    <template #footer>
      <RangeBandSlider
        v-model:minValue="config.minDistance "
        v-model:maxValue="config.maxDistance "
        :show-inputs="false"
        :min="0"
        :max="step.inputData?.width ?? 400"
        :step="1"
        :label="`Min/Max Dist: ${config.minDistance}-${config.maxDistance}`"
      />
    </template>
  </StepCard>
</template>