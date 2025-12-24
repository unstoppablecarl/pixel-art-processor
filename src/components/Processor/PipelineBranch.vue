<script setup lang="ts">
import { dragAndDrop } from '@formkit/drag-and-drop'
import { computed, onMounted, useTemplateRef } from 'vue'
import { type StepRef } from '../../lib/pipeline/Step.ts'
import { useStepStore } from '../../lib/store/step-store.ts'
import PipelineForkBranches from './PipelineForkBranches.vue'

const store = useStepStore()

const {
  stepIds,
  parentForkId,
  branchIndex,
} = defineProps<{
  stepIds: string[],
  parentForkId: null | string,
  branchIndex: null | number,
}>()

const allSteps = computed(() => {
  if (!stepIds.length) {
    return {
      steps: [],
      fork: null,
    }
  }

  let fork: StepRef | null = null

  const lastId = stepIds[stepIds.length - 1]

  let normalStepIds: string[] = []

  if (store.isFork(lastId)) {
    fork = store.get(lastId)
    normalStepIds = stepIds.slice(0, -1)
  } else {
    normalStepIds = stepIds
  }

  return {
    steps: normalStepIds.map(id => store.get(id)),
    fork,
  }
})

const branchDragContainer = useTemplateRef('branchDragContainer')

onMounted(() => {
  if (!branchDragContainer.value) return

  dragAndDrop({
    parent: branchDragContainer.value,
    getValues: () => stepIds,
    setValues: (newOrder) => {
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
    },
  })
})

</script>
<template>
  <div ref="branchDragContainer" class="processor-branch">
    <template v-for="{ def, id } in allSteps.steps" :key="id">
      <component
        :is="store.defToComponent(def)"
        :step-id="id"
        class="step"
      />
    </template>
  </div>
  <template v-if="allSteps.fork">
    <component
      :is="store.defToComponent(allSteps.fork.def)"
      :step-id="allSteps.fork.id"
      class="step"
    />
    <PipelineForkBranches :fork-step-id="allSteps.fork.id" />
  </template>
</template>