<script lang="ts">
import { type AnyStepMeta, NodeType } from '../../lib/pipeline/_types.ts'
import { STEP_META as branchStepMeta } from './Branch.vue'

export const STEP_META: AnyStepMeta = {
  type: NodeType.FORK,
  def: 'fork_step',
  displayName: 'Fork',
  passthrough: true,
  branchDefs: [branchStepMeta.def],
}
</script>
<script setup lang="ts">
import type { NodeId } from '../../lib/pipeline/_types.ts'
import { isBranch, isStep } from '../../lib/pipeline/Node.ts'
import { useForkHandler } from '../../lib/pipeline/useStepHandler.ts'
import { usePipelineStore } from '../../lib/store/pipeline-store.ts'
import type { StepImg } from '../../lib/util/vue-util.ts'
import StepCard from '../Card/StepCard.vue'
import { computed } from 'vue'

const { nodeId } = defineProps<{ nodeId: NodeId }>()

const node = useForkHandler(nodeId, {
  ...STEP_META,
  config() {
    return {}
  },
  async run({ inputData, branchIndex }) {
    console.log('Fork run', branchIndex, inputData)
    return {
      output: inputData,
      preview: inputData?.toImageData(),
    }
  },
})

const store = usePipelineStore()
const outputDataRef = store.getFork(node.id).forkOutputData

const prevNodePreview = computed(() => {
  if (!node.prevNodeId) return
  const prev = store.get(node.prevNodeId)
  if (isBranch(prev) || isStep(prev)) {
    return prev.outputPreview
  }
})

const images = computed((): StepImg[] => {
  if (!outputDataRef.value.length) {
    return [{
      label: 'Input (no branches)',
      imageData: prevNodePreview.value!,
      validationErrors: [],
    }]
  }

  return outputDataRef.value.map((item, index) => {
    return {
      imageData: item?.preview ?? null,
      label: `Branch: ${index + 1}`,
      validationErrors: item?.validationErrors ?? [],
    }
  })
})

</script>
<template>
  <StepCard
    :node="node"
    :show-add-node-btn="false"
    :copyable="false"
    :draggable="false"
    :mutable="false"
    :sub-header="`: x ${node.branchIds.value.length}`"
    :images="images"
  >
  </StepCard>
</template>