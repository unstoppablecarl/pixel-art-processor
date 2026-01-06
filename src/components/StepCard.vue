<script setup lang="ts">
import { BButton, BButtonGroup, BCollapse, BPopover } from 'bootstrap-vue-next'
import { computed } from 'vue'
import { getValidationErrorComponent } from '../lib/errors.ts'

import { INVALID_INPUT_TYPE_ERROR } from '../lib/errors/InvalidInputTypeError.ts'
import { StepValidationError } from '../lib/errors/StepValidationError.ts'
import { type AnyForkNode, type AnyInitializedNode, isBranch, isStep } from '../lib/pipeline/Node.ts'
import { useStepRegistry } from '../lib/pipeline/StepRegistry.ts'
import { usePipelineStore } from '../lib/store/pipeline-store.ts'
import type { StepImg } from '../lib/util/vue-util.ts'
import StepImage from './StepImage.vue'
import AddNodeAfterDropDown from './UI/AddNodeAfterDropDown.vue'
import SeedPopOver from './UI/SeedPopOver.vue'

const store = usePipelineStore()

const {
  node,
  images,
  showAddStepBtn = true,
  showSeed = true,
  // draggable = true,
  copyable = true,
  showDimensions = false,
  mutable = true,
  subHeader = '',
  imgColumns = 1,
} = defineProps<{
  node: AnyInitializedNode
  showDimensions?: boolean,
  images?: StepImg[],
  showAddStepBtn?: boolean,
  // draggable?: boolean,
  copyable?: boolean,
  showSeed?: boolean,
  mutable?: boolean,
  subHeader?: string,
  imgColumns?: number
}>()

const dimensions = computed(() => {
  const { width, height } = node.getOutputSize()

  return width + 'x' + height
})

function remove() {
  store.remove(node.id)
}

const nodeImages = computed((): StepImg[] => {
  if (images) return images

  if (isBranch(node) || isStep(node)) {
    return [{
      label: (node?.outputPreview?.width ?? 0) + ' x ' + (node?.outputPreview?.height ?? 0) + ' px',
      imageData: node.outputPreview,
      validationErrors: [],
    }]
  }

  return (node as AnyForkNode).forkOutputData.value.map(({ preview }, index) => {
    return {
      imageData: preview,
      label: `Branch: ${index + 1}`,
    }
  })
})

const cssStyle = computed(() => {
  const width = nodeImages.value?.[0]?.imageData?.width || node.getOutputSize().width || store.getRootNodeOutputSize().width || 64
  return [
    `--node-img-width: ${width}px;`,
    `--columns-per-card: ${imgColumns};`,
  ].join(' ')
})

const invalidInputType = computed(() => {
  return !!node.validationErrors.find((e: StepValidationError) => e.slug === INVALID_INPUT_TYPE_ERROR)
})

const validationErrors = computed(() => {
  return node.validationErrors.filter((e: StepValidationError) => e.slug !== INVALID_INPUT_TYPE_ERROR)
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
        <!--        <span-->
        <!--          v-if="draggable"-->
        <!--          role="button"-->
        <!--          class="btn btn-sm btn-secondary btn-grab"-->
        <!--          draggable="false"-->
        <!--          @pointerdown.stop-->
        <!--        >:::-->
        <!--        </span>-->
        <BPopover>
          <template #target>
            <span class="btn btn-sm btn-outline-info" style="opacity: 0.66">?</span>
          </template>

          <div>
            <strong>Input:</strong>
            {{ node.handler?.inputDataTypes?.map((t: any) => t.displayName).join(', ') }}
          </div>
          <div>
            <strong>Output:</strong>
            {{ node.handler?.outputDataType?.displayName }}
          </div>
        </BPopover>


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
        <slot name="body-and-footer">
          <div class="card-body">
            <slot name="body">

              <template
                v-for="({imageData, label, validationErrors: imgValidationErrors = []}, index) in nodeImages"
              >
                <StepImage
                  :image-data="imageData"
                  :label="label"
                  :validationErrors="imgValidationErrors"
                >
                  <template v-for="(_, name) in $slots" #[name]="slotProps">
                    <slot :name="name" v-bind="{...slotProps, index}" />
                  </template>
                </StepImage>
                <slot
                  name="after-image"
                  :index="index"
                  :label="label"
                  :validationErrors="imgValidationErrors"
                  :imageData="imageData"
                />

              </template>
            </slot>
          </div>

          <div class="card-footer">

            <div class="section" v-if="showDimensions && dimensions">
              <span class="btn-sm-py text-muted me-auto ms-1">
                Image Size: {{ dimensions }}
              </span>
            </div>

            <div class="section" v-for="error in node.validationErrors">
              <component :is="getValidationErrorComponent(error)" :error="error" />
            </div>
            <slot name="footer"></slot>
          </div>
        </slot>
      </BCollapse>
    </div>
  </div>
</template>