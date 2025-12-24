<script setup lang="ts">
import { BButtonGroup } from 'bootstrap-vue-next'
import { computed } from 'vue'
import type { StepValidationError } from '../lib/errors.ts'
import { INVALID_INPUT_TYPE } from '../lib/pipeline/StepHandler.ts'
import { useStepRegistry } from '../lib/pipeline/StepRegistry.ts'
import type { AnyConfiguredStep } from '../lib/pipeline/useStepHandler.ts'
import { useStepStore } from '../lib/store/step-store.ts'
import StepImg, { type StepImage } from './StepImg.vue'
import AddAfterStepDropDown from './UI/AddAfterStepDropDown.vue'
import SeedPopOver from './UI/SeedPopOver.vue'

const store = useStepStore()

const {
  step,
  images,
  footerTabs = false,
  showAddStepBtn = true,
  showSeed = true,
  draggable = true,
  copyable = true,
  showDimensions = true,
} = defineProps<{
  step: AnyConfiguredStep
  showDimensions?: boolean,
  images?: StepImage[],
  footerTabs?: boolean,
  showAddStepBtn?: boolean,
  draggable?: boolean,
  copyable?: boolean,
  showSeed?: boolean,
}>()

const dimensions = computed(() => {
  if (!step.outputData) return ''

  return step.outputData.width + 'x' + step.outputData.height
})

function remove() {
  store.remove(step.id)
}

const stepImages = computed(() => {
  if (!images?.length) {
    return [{
      label: '',
      imageData: step.outputPreview,
    }]
  }
  return images
})

const imageCount = computed(() => images?.length ?? 1)
const imagesTotalWidth = computed(() => {
  if (images?.length) {
    return images.reduce((acc, stepImage) => {
      const width = stepImage?.imageData?.width ?? stepImage.placeholderWidth ?? 100

      return acc + width
    }, 0)
  }
  return step?.outputData?.width
})

const cssStyle = computed(() => {
  return [
    `--stem-image-count: ${imageCount.value};`,
    `--step-total-image-width: ${imagesTotalWidth.value}px;`,
  ].join(' ')
})

const invalidInputType = computed(() => {
  return !!step.validationErrors.find((e: StepValidationError) => e.slug === INVALID_INPUT_TYPE)
})

const validationErrors = computed(() => {
  return step.validationErrors.filter((e: StepValidationError) => e.slug !== INVALID_INPUT_TYPE)
})

const executionTime = computed(() => {
  if (step.lastExecutionTimeMS === undefined) return
  return (step.lastExecutionTimeMS / 1000).toFixed(2)
})

const registry = useStepRegistry()
const header = computed(() => registry.get(step.def).displayName)

</script>
<template>
  <div ref="stepEl" class="step" :style="cssStyle">
    <div class="step-header hstack gap-1 align-items-center">
      <div>
        {{ header }}
      </div>
      <div class="execution-time ms-auto" v-if="executionTime">
        <span class="material-symbols-outlined">timer</span>
        {{ executionTime }}s
      </div>
    </div>
    <div :class="{
      'card card-step': true,
      'border-danger': validationErrors.length,
      'invalid-input-type': invalidInputType,
    }">
      <div class="card-header px-2 hstack gap-1">
        <span
          v-if="draggable"
          role="button"
          class="btn btn-sm btn-secondary btn-grab"
          draggable="false"
          @pointerdown.stop
        >:::
        </span>

        <span class="btn-py text-muted me-auto ms-1" v-if="showDimensions">
          {{ dimensions }}
        </span>
        <SeedPopOver class="ms-auto" v-if="showSeed" v-model="step.seed" />
        <BButtonGroup size="sm" class="step-header-buttons">
          <button role="button" class="btn btn-sm btn-danger" @click="remove">
            <span class="material-symbols-outlined">delete</span>
          </button>

          <button v-if="copyable" role="button" class="btn btn-sm btn-secondary" @click="store.duplicate(step.id)">
            <span class="material-symbols-outlined">content_copy</span>
          </button>

          <slot name="add-step">
            <AddAfterStepDropDown v-if="showAddStepBtn" :step-id="step.id" size="sm" />
          </slot>
        </BButtonGroup>
      </div>
      <div class="card-body">
        <slot name="body">
          <StepImg
            v-for="image in stepImages"
            :key="image.label"
            :step="step"
            :image="image"
          />
        </slot>
      </div>

      <div :class="{
        'card-footer': true,
        'card-footer-tabs': footerTabs
      }">
        <div class="pt-2 pb-3 step-validation-errors-container" v-for="error in step.validationErrors">
          <component :is="error.component" :error="error" />
        </div>
        <slot name="footer"></slot>
      </div>
    </div>
  </div>
</template>