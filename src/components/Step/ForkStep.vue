<script lang="ts">
import { STEP_FORK_DEF, StepType } from '../../lib/pipeline/Step.ts'
import type { StepMeta } from '../../lib/pipeline/StepMeta.ts'
import { PassThrough } from '../../lib/step-data-types/PassThrough.ts'

export const STEP_META: StepMeta = {
  type: StepType.FORK,
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

const { stepId } = defineProps<{ stepId: string }>()

const step = useStepHandler(stepId, {
  ...STEP_META,
  config() {
    return reactive({})
  },
  run({ inputData }) {

    return null
    //
    // return {
    //   branchesOutput: Array(branchCount).fill(inputData),
    // }
  },
  validateInputType() {
    return []
  },
})

</script>
<template>
  <StepCard
    :step="step"
    :show-add-step-btn="false"
    :copyable="false"
    :draggable="false"
    :mutable="false"
  >
    <template #body>
      FORK
    </template>
    <template #footer>

    </template>
  </StepCard>
</template>