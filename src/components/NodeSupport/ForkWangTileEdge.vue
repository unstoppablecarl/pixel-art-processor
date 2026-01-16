<script setup lang="ts">
import { BButtonGroup } from 'bootstrap-vue-next'
import { computed, watch } from 'vue'
import type { NodeId } from '../../lib/pipeline/_types.ts'
import type { RGBA } from '../../lib/util/html-dom/ImageData.ts'
import type { BinaryArray } from '../../lib/util/prng/binary-array-chunks.ts'
import {
  generateWangTileEdgePattern,
  type WangTileEdgeConfig,
  wangTileEdgePreview,
} from '../../lib/wang-tiles/wang-tile-vue-helpers.ts'
import NodeImage from '../NodeImage.vue'
import SeedPopOver from '../UI/SeedPopOver.vue'
import ForkWangTileEdgeConfig from './ForkWangTileEdgeConfig.vue'

const emit = defineEmits(['remove', 'duplicate', 'generateEdge'])

const config = defineModel<WangTileEdgeConfig>('config', { required: true })
const edge = defineModel<BinaryArray | undefined>('edge', { required: true })

const {
  size,
  nodeId,
  index,
  color,
} = defineProps<{
  index: number,
  nodeId: NodeId,
  color: RGBA,
  size: number,
}>()

watch(
  () => [
    // do not trigger on config.value.visible change
    config.value.chunks,
    config.value.shuffleSeed,
    config.value.invert,
    config.value.minGapSize,
    config.value.maxGapSize,
    config.value.minChunkSize,
    config.value.maxChunkSize,
    config.value.padding,
    config.value.seed,
    config.value.eligibleForN,
    config.value.eligibleForE,
    config.value.eligibleForS,
    config.value.eligibleForW,
  ],
  () => {
    edge.value = generateWangTileEdgePattern(size, config.value)
  },
  { immediate: true },
)

const preview = computed(() => {
  if (!edge.value) return null

  return wangTileEdgePreview(edge.value, color).toImageData()
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
    <NodeImage
      :image-data="preview"
    />
  </div>

  <div class="auto-animate" v-auto-animate>
    <div class="card-footer" v-if="config.visible">
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

          v-model:eligible-for-n="config.eligibleForN"
          v-model:eligible-for-e="config.eligibleForE"
          v-model:eligible-for-s="config.eligibleForS"
          v-model:eligible-for-w="config.eligibleForW"

          :node-id="nodeId"
          :size="size"
        />
      </div>
    </div>
  </div>
</template>