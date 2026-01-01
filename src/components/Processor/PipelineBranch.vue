<script setup lang="ts">
import { computed } from 'vue'
import { type AnyForkNode, isFork } from '../../lib/pipeline/Node.ts'
import { usePipelineStore } from '../../lib/store/pipeline-store.ts'
import { STEP_REGISTRY } from '../../steps.ts'
import PipelineForkBranches from './PipelineForkBranches.vue'

const store = usePipelineStore()
const stepRegistry = STEP_REGISTRY

type Props = {
  stepIds: string[],
}

const { stepIds, parentForkId } = defineProps<Props>()

// Convert stepIds into nodes and detect fork at end
const allSteps = computed(() => {
  if (!stepIds.length) {
    return { normalStepIds: [], steps: [], fork: null }
  }

  const steps = stepIds.map(id => store.get(id))
  const last = steps[steps.length - 1]

  if (isFork(last)) {
    return {
      normalStepIds: stepIds.slice(0, -1),
      steps: steps.slice(0, -1),
      fork: last as AnyForkNode,
    }
  }

  return {
    normalStepIds: stepIds,
    steps,
    fork: null,
  }
})
</script>

<template>
  <div ref="branchDragContainer" class="processor-branch">
    <template v-if="allSteps.steps.length">
      <template v-for="{ def, id } in allSteps.steps" :key="id">
        <component
          :is="stepRegistry.defToComponent(def)"
          :step-id="id"
          class="step"
        />
      </template>
    </template>

    <div v-else-if="parentForkId" class="empty-branch-placeholder">
      Drop Here
    </div>
  </div>

  <template v-if="allSteps.fork">
    <component
      :is="stepRegistry.defToComponent(allSteps.fork.def)"
      :step-id="allSteps.fork.id"
      class="step"
    />
    <PipelineForkBranches :fork-step-id="allSteps.fork.id" />
  </template>
</template>
