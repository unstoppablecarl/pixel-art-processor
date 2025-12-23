<script setup lang="ts">
import { dragAndDrop } from '@formkit/drag-and-drop'
import { computed, onMounted, useTemplateRef } from 'vue'
import { StepType } from '../../lib/pipeline/Step.ts'
import { useStepStore } from '../../lib/store/step-store.ts'
import PipelineForkBranches from './PipelineForkBranches.vue'

const store = useStepStore()

type DragResult = {
  newIndex: number,
  stepId: string
}

const {
  stepIds,
} = defineProps<{
  stepIds: string[],
}>()

const steps = computed(() => stepIds.map(id => store.get(id)))
const branchDragContainer = useTemplateRef('branchDragContainer')

function onDrop(dropResult: DragResult) {
  store.moveTo(dropResult.stepId, dropResult.newIndex)
}

function findMoved(newOrder: string[]): DragResult {
  for (let i = 0; i < newOrder.length; i++) {
    if (newOrder[i] !== stepIds[i]) {
      const movedId = newOrder[i]!
      return {
        stepId: movedId,
        newIndex: i,
      }
    }
  }
  throw new Error('Moved not found')
}

onMounted(() => {
  if (!branchDragContainer.value) return

  dragAndDrop({
    parent: branchDragContainer.value,
    getValues: () => stepIds,
    setValues: (newOrder) => {
      onDrop(findMoved(newOrder))
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

const fork = computed(() => {
  const last = steps.value[steps.value.length - 1]
  if (last?.type === StepType.FORK) {
    return last
  }
})

</script>
<template>
  <div ref="branchDragContainer" class="processor-container">
    <template v-for="{ def, id } in steps" :key="id">
      <component
        :is="store.defToComponent(def)"
        :step-id="id"
        class="step"
      />
    </template>
  </div>

  <template v-if="fork">
<!--    <PipelineForkBranches :fork-step-id="fork.id" />-->
  </template>
</template>