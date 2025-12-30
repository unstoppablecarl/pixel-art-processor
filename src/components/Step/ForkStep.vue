<script lang="ts">
import { STEP_FORK_DEF, StepType } from '../../lib/pipeline/Step.ts'
import type { AnyStepMeta } from '../../lib/pipeline/StepMeta.ts'

export const STEP_META: AnyStepMeta = {
  type: StepType.FORK,
  def: STEP_FORK_DEF,
  displayName: 'Fork',
  passthrough: true,
}
</script>
<script setup lang="ts">
import { useStepForkHandler } from '../../lib/pipeline/useStepHandler.ts'
import StepCard from '../StepCard.vue'

const { stepId } = defineProps<{ stepId: string }>()

const step = useStepForkHandler(stepId, {
  ...STEP_META,
  config() {
    return {}
  },
  run({ inputData, branchCount }) {

    return {
      branchesOutput: Array(branchCount).fill(inputData),
      preview: inputData?.toImageData(),
    }
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
    <template #footer>

    </template>
  </StepCard>
</template>