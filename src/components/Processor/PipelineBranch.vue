<script setup lang="ts">
import { dragAndDrop } from '@formkit/drag-and-drop'
import { computed, onMounted, useTemplateRef } from 'vue'
import { type AnyStepRef } from '../../lib/pipeline/Step.ts'
import { useBranchHandler } from '../../lib/pipeline/useStepHandler.ts'
import { useStepStore } from '../../lib/store/step-store.ts'
import { STEP_REGISTRY } from '../../steps.ts'
import PipelineForkBranches from './PipelineForkBranches.vue'

const store = useStepStore()
const stepRegistry = STEP_REGISTRY

type Props = {
  stepIds: string[],
} & (
  {
    parentForkId: null,
    branchIndex: null,
  } | {
  parentForkId: string,
  branchIndex: number,
})

const {
  stepIds,
  parentForkId,
  branchIndex,
} = defineProps<Props>()

if (parentForkId) {
  useBranchHandler(parentForkId, branchIndex)
}

const allSteps = computed(() => {
  if (!stepIds.length) {
    return {
      normalStepIds: [],
      steps: [],
      fork: null,
    }
  }

  let fork: AnyStepRef | null = null

  const lastId = stepIds[stepIds.length - 1]
  const lastStep = store.get(lastId)

  let normalStepIds: string[] = []

  if (store.stepIsFork(lastStep)) {
    fork = lastStep
    normalStepIds = stepIds.slice(0, -1)
  } else {
    normalStepIds = stepIds
  }

  return {
    normalStepIds,
    steps: normalStepIds.map(id => store.get(id)),
    fork,
  }
})

const branchDragContainer = useTemplateRef('branchDragContainer')

onMounted(() => {
  if (!branchDragContainer.value) return

  dragAndDrop({
    parent: branchDragContainer.value,
    getValues: () => allSteps.value.normalStepIds,
    setValues: (newOrder) => {
      const fork = allSteps.value.fork
      if (fork) {
        newOrder = [...newOrder, fork.id]
      }

      if (parentForkId === null) {
        store.setRootStepIds(newOrder)
      } else {
        store.setBranchStepIds(parentForkId, branchIndex!, newOrder)
      }
    },
    config: {
      group: 'steps',
      dragHandle: '.btn-grab',
      draggingClass: 'step-dragging',
      dropZoneClass: 'drop-zone',
      dragPlaceholderClass: 'drag-placeholder',
      dropZoneParentClass: 'drop-zone-parent',
    },
  })
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