<script setup lang="ts">
import { BButtonGroup } from 'bootstrap-vue-next'
import { computed } from 'vue'
import type { StepValidationError } from '../lib/errors.ts'
import { type AnyInitializedNode, isBranch, isFork, isStep } from '../lib/pipeline/Node.ts'
import { INVALID_INPUT_TYPE } from '../lib/pipeline/StepHandler.ts'
import { useStepRegistry } from '../lib/pipeline/StepRegistry.ts'
import { usePipelineStore } from '../lib/store/pipeline-store.ts'
import AddAfterStepDropDown from './StepCard/AddAfterStepDropDown.vue'
import StepImg, { type StepImage } from './StepImg.vue'
import SeedPopOver from './UI/SeedPopOver.vue'

const store = usePipelineStore()

const {
  node,
  images,
  showAddStepBtn = true,
  showSeed = true,
  draggable = true,
  copyable = true,
  showDimensions = false,
  mutable = true,
  subHeader = '',
} = defineProps<{
  node: AnyInitializedNode
  showDimensions?: boolean,
  images?: StepImage[],
  showAddStepBtn?: boolean,
  draggable?: boolean,
  copyable?: boolean,
  showSeed?: boolean,
  mutable?: boolean,
  subHeader?: string,
}>()

const dimensions = computed(() => {
  const { width, height } = node.getOutputSize()

  return width + 'x' + height
})

function remove() {
  store.remove(node.id)
}

const stepImages = computed(() => {
  if (images?.length) return images

  if (isFork(node)) {
    return node.forkOutputData.value.map(({ preview }) => {
      return {
        label: '',
        imageData: preview,
      }
    })
  }

  if (isBranch(node) || isStep(node)) {
    return [{
      label: '',
      imageData: node.outputPreview,
    }]
  }
})

const imageCount = computed(() => images?.length ?? 1)
const imagesTotalWidth = computed(() => {
  if (images?.length) {
    return images.reduce((acc, stepImage) => {
      const width = stepImage?.imageData?.width ?? stepImage.placeholderWidth ?? 100

      return acc + width
    }, 0)
  }

  return store.getRootNodeOutputSize().width
})

const cssStyle = computed(() => {
  return [
    `--stem-image-count: ${imageCount.value};`,
    `--node-total-image-width: ${imagesTotalWidth.value}px;`,
  ].join(' ')
})

const invalidInputType = computed(() => {
  return !!node.validationErrors.find((e: StepValidationError) => e.slug === INVALID_INPUT_TYPE)
})

const validationErrors = computed(() => {
  return node.validationErrors.filter((e: StepValidationError) => e.slug !== INVALID_INPUT_TYPE)
})

const executionTime = computed(() => {
  if (node.lastExecutionTimeMS === undefined) return
  return (node.lastExecutionTimeMS / 1000).toFixed(2)
})

const registry = useStepRegistry()
const header = computed(() => registry.get(node.def).displayName)

function toggleMute() {
  node.muted = !node.muted
}

</script>
<template>
  <div ref="stepEl" class="node" :style="cssStyle">
    <div class="node-header hstack gap-1 align-items-center">
      <div>
        {{ header }} {{ subHeader }}
      </div>
      <div class="execution-time ms-auto" v-if="executionTime">
        <span class="material-symbols-outlined">timer</span>
        {{ executionTime }}s
      </div>
    </div>
    <div :class="{
      'card card-node': true,
      'border-warning': node.muted,
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

        <SeedPopOver class="ms-auto" v-if="showSeed" v-model="node.seed" />
        <BButtonGroup size="sm" class="node-header-buttons">
          <button role="button" class="btn btn-sm btn-danger" @click="remove">
            <span class="material-symbols-outlined">delete</span>
          </button>

          <button
            v-if="mutable"
            role="button"
            :class="{
              'btn btn-sm': true,
              'active btn-warning': node.muted,
              'btn-secondary': !node.muted,
            }"
            @click="toggleMute"
          >
            <span class="material-symbols-outlined">{{ node.muted ? 'visibility_off' : 'visibility' }}</span>
          </button>

          <button v-if="copyable" role="button" class="btn btn-sm btn-secondary"
                  @click="store.duplicateStepNode(node.id)">
            <span class="material-symbols-outlined">content_copy</span>
          </button>

          <slot name="add-node">
            <AddAfterStepDropDown v-if="showAddStepBtn" :node-id="node.id" size="sm" />
          </slot>
        </BButtonGroup>
      </div>

      <slot name="body-outer">
        <div class="card-body">
          <slot name="body">
            <StepImg
              v-for="({imageData, label}, index) in stepImages"
              :image-data="imageData"
              :label="label"
              :key="index"
            />
          </slot>
        </div>
      </slot>

      <div class="card-footer">
        <div class="section" v-if="showDimensions && dimensions">
          <span class="btn-sm-py text-muted me-auto ms-1">
            Image Size: {{ dimensions }}
          </span>
        </div>
        <div class="section" v-if="isStep(node) ? node.validationErrors : false" v-for="error in node.validationErrors">
          <component :is="error.component" :error="error" />
        </div>
        <slot name="footer"></slot>
      </div>
    </div>
  </div>
</template>