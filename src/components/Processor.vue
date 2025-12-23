<script setup lang="ts">
import { dragAndDrop } from '@formkit/drag-and-drop'
import { BButtonGroup } from 'bootstrap-vue-next'
import { computed, onMounted, useTemplateRef, watch } from 'vue'
import { StepType } from '../lib/pipeline/Step.ts'
import { useScaleStore } from '../lib/store/scale-store.ts'
import { useStepStore } from '../lib/store/step-store.ts'
import AppHeader from './AppHeader.vue'
import PatternPreview from './Processor/PatternPreview.vue'
import AddStepButtons from './UI/AddStepButtons.vue'
import AddToBranchStepDropDown from './UI/AddToBranchStepDropDown.vue'

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

  <div class="overflow">
    <div class="processor-container px-3 pb-3 min-vw-100">
      <div ref="stepContainer" class="steps-container">
        <template v-for="{ def, id, type } in steps" :key="id">

          <component
            :is="store.defToComponent(def)"
            :step-id="id"
            class="step"
          />

          <div v-if="type === StepType.FORK" class="fork-branches">
            <div
              v-for="(branchStepIds, branchIndex) in store.getBranches(id)"
              :key="`${id}-branch-${branchIndex}`"
              class="branch"
            >
              <component
                v-for="stepId in branchStepIds"
                :key="stepId"
                :is="store.defToComponent(store.get(stepId).def)"
                :step-id="stepId"
                class="step"
              />
              <BButtonGroup class="btn-group">
                <button role="button" class="btn btn-sm btn-danger d-inline-block"
                        @click="store.removeBranch(id, branchIndex)">
                  <span class="material-symbols-outlined">delete</span>
                </button>
                <button role="button" class="btn btn-sm btn-secondary d-inline-block"
                        @click="store.duplicateBranch(id, branchIndex)">
                  <span class="material-symbols-outlined">content_copy</span>
                </button>

                <template v-if="!branchStepIds.length">
                  <AddToBranchStepDropDown :step="store.get(id)" :branch-index="branchIndex" />
                </template>
              </BButtonGroup>
            </div>

            <button role="button" class="btn btn-sm btn-secondary" @click="store.addBranch(id)">
              <span class="material-symbols-outlined">add</span> Branch
            </button>
          </div>
        </template>
      </div>
    </div>
    <div class="after-steps-container">
      <AddStepButtons />
    </div>
    <PatternPreview />
  </div>
</template>
