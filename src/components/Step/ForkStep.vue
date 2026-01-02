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
import StepImg from '../StepImg.vue'

const { nodeId } = defineProps<{ nodeId: NodeId }>()

const node = useForkHandler(nodeId, {
  ...STEP_META,
  config() {
    return {}
  },
  async run({ inputData, branchIndex }) {

    console.log('ForkStep run', inputData, branchIndex)
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

    <template #body>

      <div v-for="({preview, validationErrors}, index) in node.outputData ??[]">
        <template v-if="preview">
          <StepImg
            :image-data="preview"
          />
          <div>Branch: {{ index + 1 }}</div>
        </template>
        <div class="section" v-for="error in validationErrors">
          <component :is="error.component" :error="error" />
        </div>
      </div>
    </template>
  </StepCard>
</template>