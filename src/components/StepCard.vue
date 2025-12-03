<script setup lang="ts">
import { computed } from 'vue'
import type { StepValidationError } from '../lib/errors.ts'
import { INVALID_INPUT_TYPE } from '../lib/pipeline/StepHandler.ts'
import type { AnyConfiguredStep } from '../lib/pipeline/useStepHandler.ts'
import { useStepStore } from '../lib/store/step-store.ts'
import StepImg, { type StepImage } from './StepImg.vue'

const store = useStepStore()

const {
  step,
  images,
} = defineProps<{
  step: AnyConfiguredStep
  showDimensions?: boolean,
  images?: StepImage[]
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

</script>
<template>
  <div ref="stepEl" class="step" :style="cssStyle">
    <div class="step-header">
      <slot name="header"></slot>
    </div>
    <div :class="{
      'card card-step': true,
      'border-danger': validationErrors.length,
      'invalid-input-type': invalidInputType,
    }">
      <div class="card-header px-2 d-flex">
        <span role="button"
                class="btn btn-sm btn-secondary btn-grab"
                draggable="false"
                @pointerdown.stop
        >:::
        </span>

        <span class="btn-py mx-2 flex-grow-1 text-muted text-end">{{ dimensions }}</span>
        <button role="button" class="btn btn-sm btn-danger flex-shrink-1" @click="remove">X</button>
      </div>
      <div class="card-body">
        <StepImg
          v-for="image in stepImages"
          :key="image.label"
          :step="step"
          :image="image"
        />
      </div>
      <div class="card-footer">
        <div class="pt-2 pb-3" v-for="error in step.validationErrors">
          <component :is="error.component" :error="error" />
        </div>
        <slot name="footer"></slot>
      </div>
    </div>
  </div>
</template>