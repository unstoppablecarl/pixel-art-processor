<script lang="ts">
import { STEP_FORK_DEF } from '../../lib/pipeline/Step.ts'
import type { StepMeta } from '../../lib/pipeline/StepMeta.ts'
import { PassThrough } from '../../lib/step-data-types/PassThrough.ts'

export const STEP_META: StepMeta = {
  def: STEP_FORK_DEF,
  displayName: 'Fork',
  inputDataTypes: [PassThrough],
  outputDataType: PassThrough,
}
</script>
<script setup lang="ts">
import { reactive } from 'vue'
import { useStepHandler } from '../../lib/pipeline/useStepHandler.ts'
import StepCard from '../StepCard.vue'
import RangeSlider from '../UI/RangeSlider.vue'

const { stepId } = defineProps<{ stepId: string }>()

const CONFIG_DEFAULTS = {
  count: 1,
}

const step = useStepHandler(stepId, {
  ...STEP_META,
  config() {
    return reactive({
      ...CONFIG_DEFAULTS,
    })
  },
  run({ inputData }) {
    return {
      preview: null,
      output: inputData,
    }
  },
  validateInputType() {
    return []
  },
})

const config = step.config!
</script>
<template>
  <StepCard
    :step="step"
    :show-add-step-btn="false"
    :copyable="false"
    :draggable="false"
    :show-seed="false"
  >
    <template #body>
      FORK
    </template>
    <template #footer>
      <RangeSlider
        :id="`${stepId}-count`"
        label="Count"
        v-model:value="config.count"
        :min="0"
        :max="100"
        :step="1"
      />
    </template>
  </StepCard>
</template>