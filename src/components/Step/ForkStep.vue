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
import { isBranch, isStep, type NodeId } from '../../lib/pipeline/Node.ts'
import { useForkHandler } from '../../lib/pipeline/useStepHandler.ts'
import { usePipelineStore } from '../../lib/store/pipeline-store.ts'
import StepCard, { type StepImage } from '../StepCard.vue'
import { computed } from 'vue'

const { nodeId } = defineProps<{ nodeId: NodeId }>()

const node = useForkHandler(nodeId, {
  ...STEP_META,
  config() {
    return {}
  },
  async run({ inputData, branchIndex }) {
    console.log('ForkStep run', branchIndex, inputData)
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

const images = computed((): StepImage[] => {
  if (!outputDataRef.value.length) {
    return [{
      label: 'Input (no branches)',
      imageData: prevNodePreview.value!,
      validationErrors: [],
    }]
  }

  return outputDataRef.value.map(({ preview, validationErrors }, index) => {
    return {
      imageData: preview,
      label: `Branch: ${index + 1}`,
      validationErrors,
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