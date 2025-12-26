<script setup lang="ts">
import { BButtonGroup } from 'bootstrap-vue-next'
import { computed } from 'vue'
import type { StepValidationError } from '../lib/errors.ts'
import { INVALID_INPUT_TYPE } from '../lib/pipeline/StepHandler.ts'
import { useStepRegistry } from '../lib/pipeline/StepRegistry.ts'
import type { AnyConfiguredStep } from '../lib/pipeline/useStepHandler.ts'
import { useStepStore } from '../lib/store/step-store.ts'
import AddAfterStepDropDown from './StepCard/AddAfterStepDropDown.vue'
import StepImg, { type StepImage } from './StepImg.vue'
import SeedPopOver from './UI/SeedPopOver.vue'

const store = useStepStore()

const {
  step,
  images,
  showAddStepBtn = true,
  showSeed = true,
  draggable = true,
  copyable = true,
  showDimensions = false,
  mutable = true,
} = defineProps<{
  step: AnyConfiguredStep
  showDimensions?: boolean,
  images?: StepImage[],
  showAddStepBtn?: boolean,
  draggable?: boolean,
  copyable?: boolean,
  showSeed?: boolean,
  mutable?: boolean,
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

function toggleMute() {
  step.muted = !step.muted
}
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
      'border-warning': step.muted,
      'border-danger': validationErrors.length,
      'invalid-input-type': invalidInputType,
    }">

      <div class="card-header hstack gap-1">
        <span
          v-if="draggable"
          role="button"
          class="btn btn-sm btn-secondary btn-grab"
          draggable="false"
          @pointerdown.stop
        >:::
        </span>

        <SeedPopOver class="ms-auto" v-if="showSeed" v-model="step.seed" />
        <BButtonGroup size="sm" class="step-header-buttons">
          <button role="button" class="btn btn-sm btn-danger" @click="remove">
            <span class="material-symbols-outlined">delete</span>
          </button>

          <button
            v-if="mutable"
            role="button"
            :class="{
              'btn btn-sm': true,
              'active btn-warning': step.muted,
              'btn-secondary': !step.muted,
            }"
            @click="toggleMute"
          >
            <span class="material-symbols-outlined">{{ step.muted ? 'visibility_off' : 'visibility' }}</span>
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

      <div class="card-footer">

        <div class="section" v-if="showDimensions && dimensions">
          <span class="btn-sm-py text-muted me-auto ms-1">
            Image Size: {{ dimensions }}
          </span>
        </div>
        <div class="section" v-for="error in step.validationErrors">
          <component :is="error.component" :error="error" />
        </div>
        <slot name="footer"></slot>
      </div>
    </div>
  </div>
</template>