<script setup lang="ts">
import { dragAndDrop } from '@formkit/drag-and-drop'
import { computed, onMounted, useTemplateRef } from 'vue'
import { StepType } from '../../lib/pipeline/Step.ts'
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

const steps = computed(() => stepIds.map(id => store.get(id)))
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

const fork = computed(() => {
  const last = steps.value[steps.value.length - 1]
  if (last?.type === StepType.FORK) {
    return last
  }
})

</script>
<template>
  <div ref="branchDragContainer" class="processor-branch">
    <template v-for="{ def, id } in steps" :key="id">
      <component
        :is="store.defToComponent(def)"
        :step-id="id"
        class="step"
      />
    </template>
  </div>
  <PipelineForkBranches :fork-step-id="fork.id" v-if="fork" />
</template>