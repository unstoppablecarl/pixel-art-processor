<script setup lang="ts">
import { BButton, BButtonGroup, BPopover } from 'bootstrap-vue-next'
import { computed, ref } from 'vue'
import { NodeType } from '../../lib/pipeline/_types.ts'
import { getValidationErrorComponent } from '../../lib/pipeline/errors/errors.ts'
import { INVALID_INPUT_STATIC_TYPE_ERROR } from '../../lib/pipeline/errors/InvalidInputStaticTypeError.ts'
import { StepValidationError } from '../../lib/pipeline/errors/StepValidationError.ts'
import { type InitializedForkNode, type InitializedNode, isBranch, isStep } from '../../lib/pipeline/Node.ts'
import { getNodeRegistry } from '../../lib/pipeline/NodeRegistry.ts'
import { usePipelineStore } from '../../lib/store/pipeline-store.ts'
import type { StepImg } from '../../lib/util/vue-util.ts'
import NodeImage from '../NodeImage.vue'
import AddNodeAfterDropDown from '../UI/AddNodeAfterDropDown.vue'
import ExecutionTimer from '../UI/ExecutionTimer.vue'
import NodeInfoContent from '../UI/NodeInfoContent.vue'
import SeedPopOver from '../UI/SeedPopOver.vue'

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
} = defineProps<NodeProps<any>>()

export type NodeProps<N extends InitializedNode<any, any, any, any>> = {
  node: N,
  showDimensions?: boolean,
  images?: StepImg[],
  showAddStepBtn?: boolean,
  // draggable?: boolean,
  copyable?: boolean,
  showSeed?: boolean,
  mutable?: boolean,
  subHeader?: string,
  imgColumns?: number
}

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

  const fork = node as InitializedForkNode<any, any, any, any>
  if (!fork.forkOutputData.value.length) {
    return [{
      label: 'Input (no branches)',
      imageData: fork.getPrev(store)?.outputPreview!,
      validationErrors: [],
    }]
  }

  return fork.forkOutputData.value.map((item, index) => {
    return {
      imageData: item?.preview ?? null,
      label: `Branch: ${index + 1}`,
      validationErrors: item?.validationErrors ?? [],
    }
  })
})

const cssStyle = computed(() => {
  const width = nodeImages.value?.[0]?.imageData?.width || store.getFallbackOutputWidth(node)

  return [
    `--node-img-width: ${width}px;`,
    `--columns-per-card: ${imgColumns};`,
  ].join(' ')
})

const invalidInputType = computed(() => {
  return !!node.validationErrors.find((e: StepValidationError) => e.slug === INVALID_INPUT_STATIC_TYPE_ERROR)
})

const validationErrors = computed(() => {
  return node.validationErrors.filter((e: StepValidationError) => e.slug !== INVALID_INPUT_STATIC_TYPE_ERROR)
})

const registry = getNodeRegistry()
const header = computed(() => registry.get(node.def).displayName)

function toggleMute() {
  if (!isStep(node)) throw new Error('can only mute step nodes')
  node.muted = !node.muted
}

const isPaused = node.paused
const isMuted = computed(() => isStep(node) && node.muted)
const settingsVisible = ref(true)

const pauseHovered = ref(false)
const muteHovered = ref(false)

function togglePaused() {
  node.paused.value = !node.paused.value
}
</script>
<template>
  <div ref="stepEl" class="node" :style="cssStyle">
    <div class="node-header hstack gap-1">
      <div>
        {{ header }} {{ subHeader }}
      </div>
      <ExecutionTimer :time-ms="node.lastExecutionTimeMS" class="ms-auto" />
    </div>
    <div :class="{
      'card': true,
      'card-step': node.type === NodeType.STEP,
      'card-fork': node.type === NodeType.FORK,
      'node-card-border-warning': isMuted,
      'node-card-border-info': isPaused,
      'node-card-border-danger': validationErrors.length,
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

        <BButtonGroup size="sm" class="node-header-buttons">
          <span ref="btnInfo" class="btn btn-sm btn-transparent btn-node-info">
            <span class="material-symbols-outlined">
              question_mark
            </span>
          </span>
          <button
            ref="btnMute"
            v-if="mutable && isStep(node)"
            role="button"
            :class="{
              'btn btn-sm': true,
              'active btn-warning': node.muted,
              'btn-secondary': !node.muted,
              'disabled': isPaused,
            }"
            @click.prevent="toggleMute"
            @mouseenter="muteHovered = true"
            @mouseleave="muteHovered = false"
          >

            <span class="material-symbols-outlined">{{ node.muted ? 'visibility_off' : 'visibility' }}</span>
          </button>
          <button
            ref="btnPause"
            role="button"
            :class="{
              'btn btn-sm': true,
              'active btn-info': isPaused,
              'btn-secondary': !isPaused,
              'disabled': isMuted,
            }"
            @click.prevent="togglePaused"
            @mouseenter="pauseHovered = true"
            @mouseleave="pauseHovered = false"
          >
            <span class="material-symbols-outlined">{{ isPaused ? 'play_arrow' : 'pause' }}</span>
          </button>
        </BButtonGroup>

        <BPopover :target="(() => $refs.btnInfo) as unknown as Readonly<HTMLElement>"
                  teleport-to="body"
        >
          <NodeInfoContent :node-id="node.id" />
        </BPopover>

        <BPopover :target="(() => $refs.btnPause) as unknown as Readonly<HTMLElement>"
                  teleport-to="body"
                  :manual="true"
                  v-model="pauseHovered"
        >
          <strong>Pause:</strong> Node and descendants will not run while paused
        </BPopover>
        <BPopover :target="(() => $refs.btnMute) as unknown as Readonly<HTMLElement>"
                  teleport-to="body"
                  :manual="true"
                  v-model="muteHovered"
        >
          <strong>Mute:</strong> Skip this node
        </BPopover>


        <SeedPopOver class="ms-auto" v-if="showSeed" v-model="node.seed" />
        <BButtonGroup size="sm" class="node-header-buttons">
          <button role="button" class="btn btn-sm btn-danger" @click="remove">
            <span class="material-symbols-outlined">delete</span>
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
      <div class="auto-animate" v-auto-animate>
        <slot name="body-and-footer" v-if="node.visible">
          <div class="card-body">
            <slot name="body">

              <template
                v-for="({imageData, label, validationErrors: imgValidationErrors = []}, index) in nodeImages"
              >
                <NodeImage
                  :image-data="imageData"
                  :label="label"
                  :validationErrors="imgValidationErrors"
                >
                  <template v-for="(_, name) in $slots" #[name]="slotProps">
                    <slot :name="name" v-bind="{...slotProps, index}" />
                  </template>
                </NodeImage>
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
            <div class="section hstack" v-if="showDimensions && dimensions">
              <span class="btn-sm-py text-muted me-auto ms-1">
                Image Size: {{ dimensions }}
              </span>

              <BButton
                :class="'btn-collapse btn-xs ms-1 ' + (settingsVisible ? null : 'collapsed')"
                size="sm"
                variant="transparent"
                :aria-expanded="settingsVisible ? 'true' : 'false'"
                @click="settingsVisible = !settingsVisible"
              />
            </div>

            <div class="section" v-for="error in node.validationErrors">
              <component :is="getValidationErrorComponent(error)" :error="error" />
            </div>

            <div lass="auto-animate" v-auto-animate>
              <slot name="footer" v-if="settingsVisible"></slot>
            </div>
          </div>
        </slot>
      </div>
    </div>
  </div>
</template>