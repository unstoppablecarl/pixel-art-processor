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
import type { NodeId } from '../../lib/pipeline/Node.ts'
import { useForkHandler } from '../../lib/pipeline/useStepHandler.ts'
import StepCard from '../StepCard.vue'

const { nodeId } = defineProps<{ nodeId: NodeId }>()

const node = useForkHandler(nodeId, {
  ...STEP_META,
  config() {
    return {}
  },
  async run({ inputData }) {

    return {
      output: inputData,
      preview: inputData?.toImageData(),
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
    :sub-header="`: x ${node.branchIds.length}`"
  >
    <template #footer>

    </template>
  </StepCard>
</template>