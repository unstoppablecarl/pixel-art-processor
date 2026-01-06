<script setup lang="ts">
import { BCollapse } from 'bootstrap-vue-next'
import { computed, watch } from 'vue'
import type { BinaryArray } from '../../lib/util/prng/binary-array-chunks.ts'
import {
  generateWangTileEdgePattern,
  type WangTileEdgeConfig,
  wangTileEdgePreview,
} from '../../lib/wang-tiles/wang-tile-vue-helpers.ts'
import StepImage from '../StepImage.vue'
import SeedPopOver from '../UI/SeedPopOver.vue'
import ForkWangTileEdgeConfig from './ForkWangTileEdgeConfig.vue'

const emit = defineEmits(['remove'])

const config = defineModel<WangTileEdgeConfig>('config', { required: true })
const edges = defineModel<BinaryArray[]>('edges', { required: true })

const {
  size,
  nodeId,
  index,
} = defineProps<{
  index: number,
  nodeId: string,
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
      <button role="button" class="btn btn-xs btn-danger ms-1" @click="emit('remove')">
        <span class="material-symbols-outlined">delete</span>
      </button>
      <button
        role="button"
        :class="'btn btn-collapse btn-transparent btn-xs ms-1 ' + (config.visible ? null : 'collapsed')"
        :aria-expanded="config.visible ? 'true' : 'false'"
        @click="config.visible = !config.visible"
      />
    </div>
  </div>
  <BCollapse
    v-model="config.visible"
    lazy
  >
    <div class="card-body">
      <StepImage
        :image-data="preview"
      />
    </div>
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
</template>