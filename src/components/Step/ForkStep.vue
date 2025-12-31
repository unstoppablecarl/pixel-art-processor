<script lang="ts">
import { NodeType } from '../../lib/pipeline/Node.ts'
import type { AnyStepMeta } from '../../lib/pipeline/StepMeta.ts'

export const STEP_META: AnyStepMeta = {
  type: NodeType.FORK,
  def: 'fork_step',
  displayName: 'Fork',
  passthrough: true,
}
</script>
<script setup lang="ts">
import { useStepForkHandler } from '../../lib/pipeline/useStepHandler.ts'
import { useStepStore } from '../../lib/store/step-store.ts'
import StepCard from '../StepCard.vue'

const store = useStepStore()
const { stepId } = defineProps<{ stepId: string }>()

const step = useStepForkHandler(stepId, {
  ...STEP_META,
  config() {
    return {}
  },
  run({ inputData, branchIndex }) {

    return {
      branchesOutput: Array(branchIndex).fill(inputData),
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
    :sub-header="`: x ${store.getBranches(stepId).length}`"
  >
    <template #footer>

    </template>
  </StepCard>
</template>