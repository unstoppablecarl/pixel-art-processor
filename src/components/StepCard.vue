<script setup lang="ts">
import { BButton, BButtonGroup, BCollapse } from 'bootstrap-vue-next'
import { computed } from 'vue'
import type { StepValidationError } from '../lib/errors.ts'
import { type AnyInitializedNode, isBranch, isFork, isStep } from '../lib/pipeline/Node.ts'
import { INVALID_INPUT_TYPE } from '../lib/pipeline/StepHandler.ts'
import { useStepRegistry } from '../lib/pipeline/StepRegistry.ts'
import { usePipelineStore } from '../lib/store/pipeline-store.ts'
import StepImg from './StepImg.vue'
import AddNodeAfterDropDown from './UI/AddNodeAfterDropDown.vue'
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
  imgColumns = 1,
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
  imgColumns?: number
}>()

export type StepImage = {
  imageData: ImageData | null,
  label?: string,
  placeholderWidth?: number,
  placeholderHeight?: number,
  validationErrors?: StepValidationError[]
}

const dimensions = computed(() => {
  const { width, height } = node.getOutputSize()

  return width + 'x' + height
})

function remove() {
  store.remove(node.id)
}

const nodeImages = computed(() => {
  if (images) return images

  if (isFork(node)) {
    throw new Error('fork must provide images via props.images')
  }

  if (isBranch(node) || isStep(node)) {
    return [{
      label: (node?.outputPreview?.width ?? 0) + ' x ' + (node?.outputPreview?.height ?? 0) + ' px',
      imageData: node.outputPreview,
      validationErrors: [],
    }]
  }
})

const cssStyle = computed(() => {
  const width = nodeImages.value?.[0]?.imageData?.width || node.getOutputSize().width || store.getRootNodeOutputSize().width || 64
  return [
    `--node-img-width: ${width}px;`,
    `--columns-per-card: ${imgColumns};`,
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
  if (!isStep(node)) throw new Error('can only mute step nodes')
  node.muted = !node.muted
}

const isMuted = computed(() => isStep(node) && node.muted)
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
      'border-warning': isMuted,
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
            v-if="mutable && isStep(node)"
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
            <AddNodeAfterDropDown
              size="sm"
              v-if="showAddStepBtn"
              :node-id="node.id"
            />
          </slot>
        </BButtonGroup>

        <BButton
          :class="'btn-collapse ms-1 ' + (node.visible ? null : 'collapsed')"
          size="sm"
          variant="transparent"
          :aria-expanded="node.visible ? 'true' : 'false'"
          @click="node.visible = !node.visible"
        />
      </div>
      <BCollapse
        v-model="node.visible"
        lazy
      >
        <slot name="body-outer">
          <div class="card-body">
            <div
              v-for="({imageData, label, validationErrors: imgValidationErrors = []}) in nodeImages"
              class="node-img-container"
            >
              <div class="node-img-label" v-if="label">{{ label }}</div>
              {{}}
              <StepImg :image-data="imageData" />
              <div class="section" v-for="error in imgValidationErrors">
                <component :is="error.component" :error="error" />
              </div>
            </div>
          </div>
        </slot>

        <div class="card-footer">

          <div class="section" v-if="showDimensions && dimensions">
            <span class="btn-sm-py text-muted me-auto ms-1">
              Image Size: {{ dimensions }}
            </span>
          </div>

          <div class="section" v-for="error in node.validationErrors">
            <component :is="error.component" :error="error" />
          </div>
          <slot name="footer"></slot>
        </div>
      </BCollapse>
    </div>
  </div>
</template>