<script setup lang="ts">
import { BButtonGroup, BCollapse } from 'bootstrap-vue-next'
import { computed, shallowRef, watch } from 'vue'
import { getValidationErrorComponent } from '../../lib/errors.ts'
import type { StepValidationError } from '../../lib/errors/StepValidationError.ts'
import type { NodeId } from '../../lib/pipeline/_types.ts'
import { usePipelineStore } from '../../lib/store/pipeline-store.ts'
import type { BinaryArray } from '../../lib/util/prng/binary-array-chunks.ts'
import {
  generateWangTileEdgePattern,
  type WangTileEdgeConfig,
  wangTileEdgePreview,
} from '../../lib/wang-tiles/wang-tile-vue-helpers.ts'
import StepImage from '../StepImage.vue'
import SeedPopOver from '../UI/SeedPopOver.vue'
import ForkWangTileEdgeConfig from './ForkWangTileEdgeConfig.vue'

const emit = defineEmits(['remove', 'duplicate'])

const config = defineModel<WangTileEdgeConfig>('config', { required: true })
const edges = defineModel<BinaryArray[]>('edges', { required: true })

const {
  size,
  nodeId,
  index,
} = defineProps<{
  index: number,
  nodeId: NodeId,
  size: number,
}>()

watch(() => config, () => {
  edges.value[index] = generateWangTileEdgePattern(size, config.value)
}, { deep: true, immediate: true })

const preview = computed(() => {
  const binaryArray = edges.value[index]
  if (!binaryArray) return null

  return wangTileEdgePreview(binaryArray).toImageData()
})

const store = usePipelineStore()

const validationErrors = shallowRef<StepValidationError[]>([])

watch(() => config, () => {
  const forkOutputData = store.getFork(nodeId).forkOutputData
  validationErrors.value = forkOutputData.value[index]?.validationErrors ?? []

}, { deep: true, immediate: true })

</script>
<template>
  <div class="card-header">
    <div class="section-heading-container hstack">
      <span class="section-heading-text">
        Wang Edge: {{ index + 1 }}
      </span>
      <SeedPopOver
        class="ms-auto"
        label="Generator"
        v-model="config.seed"
      />
      <BButtonGroup size="sm" class="ms-1">
        <button role="button" class="btn btn-xs btn-secondary" @click="emit('duplicate')">
          <span class="material-symbols-outlined">content_copy</span>
        </button>
        <button role="button" class="btn btn-xs btn-danger" @click="emit('remove')">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </BButtonGroup>
      <button
        role="button"
        :class="'btn btn-collapse btn-transparent btn-xs ms-1 ' + (config.visible ? null : 'collapsed')"
        :aria-expanded="config.visible ? 'true' : 'false'"
        @click="config.visible = !config.visible"
      />
    </div>
  </div>

  <div class="card-body">
    <StepImage
      :image-data="preview"
    />
  </div>
  <BCollapse
    v-model="config.visible"
    lazy
  >
    <div class="card-footer">
      <div class="section">

        <ForkWangTileEdgeConfig
          :index="index"
          v-model:chunks="config.chunks"
          v-model:shuffle-seed="config.shuffleSeed"
          v-model:invert="config.invert"
          v-model:min-gap-size="config.minGapSize"
          v-model:max-gap-size="config.maxGapSize"
          v-model:min-chunk-size="config.minChunkSize"
          v-model:max-chunk-size="config.maxChunkSize"
          v-model:padding="config.padding"
          :node-id="nodeId"
          :size="size"
        />
      </div>


    </div>
  </BCollapse>
  <div class="card-footer">
    <div class="section">
      <template v-for="error in validationErrors">
        <component :is="getValidationErrorComponent(error)" :error="error" />
      </template>
    </div>
  </div>
</template>