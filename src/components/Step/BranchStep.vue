<script lang="ts">
import { NodeType } from '../../lib/pipeline/Node.ts'
import type { AnyStepMeta } from '../../lib/pipeline/StepMeta.ts'
import { BRANCH_DEF } from '../../lib/pipeline/StepRegistry.ts'

export const STEP_META: AnyStepMeta = {
  type: NodeType.BRANCH,
  def: BRANCH_DEF,
  displayName: 'Branch',
  passthrough: true,
}
</script>
<script setup lang="ts">
import type { NodeId } from '../../lib/pipeline/Node.ts'
import { useStepHandler } from '../../lib/pipeline/useStepHandler.ts'
import StepCard from '../StepCard.vue'

const { nodeId } = defineProps<{ nodeId: NodeId }>()

const node = useStepHandler(nodeId, {
  ...STEP_META,
  config() {
    return {}
  },
  async run({ inputData }) {

    return {
      output: inputData,
    }
  },
})

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

    </template>
  </StepCard>
</template>