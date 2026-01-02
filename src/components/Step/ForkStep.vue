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
import StepCard from '../StepCard.vue'
import StepImg from '../StepImg.vue'
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
</script>
<template>
  <StepCard
    :node="node"
    :show-add-node-btn="false"
    :copyable="false"
    :draggable="false"
    :mutable="false"
    :sub-header="`: x ${node.branchIds.value.length}`"
  >
    <template #body-outer>
      <div class="card-body card-body-multi-image">
        <div
          v-if="!outputDataRef.length && prevNodePreview"
          class="node-img-container"
        >
          <div class="node-img-label">Input (no branches)</div>
          <StepImg
            :image-data="prevNodePreview"
          />
        </div>

        <div
          v-for="({preview, validationErrors}, index) in outputDataRef"
          class="node-img-container"
        >
          <template v-if="preview">
            <div class="node-img-label">Branch: {{ index + 1 }}</div>
            <StepImg
              :image-data="preview"
            />
          </template>
          <div class="section" v-for="error in validationErrors">
            <component :is="error.component" :error="error" />
          </div>
        </div>
      </div>
    </template>
  </StepCard>
</template>