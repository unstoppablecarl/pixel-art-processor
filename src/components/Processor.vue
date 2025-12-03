<script setup lang="ts">
import { dragAndDrop } from '@formkit/drag-and-drop'
import { computed, onMounted, useTemplateRef, watch } from 'vue'
import { useScaleStore } from '../lib/store/scale-store.ts'
import { useStepStore } from '../lib/store/step-store.ts'
import AppHeader from './AppHeader.vue'
import AddStepButtons from './UI/AddStepButtons.vue'

const store = useStepStore()

const stepContainer = useTemplateRef('stepContainer')

// initialize
const scaleStore = useScaleStore()

watch(() => scaleStore.scale, () => {
  const root = document.documentElement
  root.style.setProperty('--step-img-scale', '' + scaleStore.scale)
}, { immediate: true })

type DragResult = {
  newIndex: number,
  stepId: string
}

function onDrop(dropResult: DragResult) {
  store.moveTo(dropResult.stepId, dropResult.newIndex)
}

const steps = computed(() => store.all())

function addStep(def: string) {
  store.add(def)
}

function findMoved(newOrder: string[]): DragResult {
  const oldOrder = store.stepIdOrder
  for (let i = 0; i < newOrder.length; i++) {
    if (newOrder[i] !== oldOrder[i]) {
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
  if (!stepContainer.value) return

  dragAndDrop({
    parent: stepContainer.value,
    getValues: () => store.stepIdOrder,
    setValues: (newOrder) => {
      onDrop(findMoved(newOrder))
    },
    config: {
      dragHandle: '.btn-grab',
      draggingClass: 'step-dragging',
      dropZoneClass: 'drop-zone',
      dragPlaceholderClass: 'drag-placeholder',
    },
  })
})
</script>
<template>

  <AppHeader @add-step="addStep" />

  <div class="overflow min-vh-100">
    <div class="processor-container px-3 pb-3 min-vw-100">
      <div ref="stepContainer" class="steps-container">
        <component
          v-for="{ def, id } in steps"
          :key="id"
          :is="store.defToComponent(def)"
          :step-id="id"
        />
      </div>
      <div class="after-steps-container">
        <AddStepButtons />
      </div>
    </div>
  </div>
</template>
