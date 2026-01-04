<script setup lang="ts">
import { computed } from 'vue'
import { usePipelineStore } from '../lib/store/pipeline-store.ts'
import { imageDataToUrlImage } from '../lib/util/ImageData.ts'
import type { StepImg } from '../lib/util/vue-util.ts'

const store = usePipelineStore()
const {
  imageData,
  label = '',
  placeholderWidth = 0,
  placeholderHeight = 0,
  validationErrors = [],
} = defineProps<StepImg>()

const size = computed(() => {
  const rootSize = store.getRootNodeOutputSize()
  const width = (imageData?.width ?? placeholderWidth) || rootSize.width || 64
  const height = (imageData?.height ?? placeholderHeight) || rootSize.height || 64

  return {
    width: width * store.imgScale,
    height: height * store.imgScale,
  }
})

const encoded = computed(() => {
  if (!imageData) {
    return '/placeholder.png'
  }
  return imageDataToUrlImage(imageData)
})

</script>
<template>
  <div class="node-img-container">
    <div class="node-img-label" v-if="label">{{ label }}</div>

    <img
      :alt="label"
      class="node-img"
      :src="encoded"
      style="image-rendering: pixelated;"
      :width="size.width"
      :height="size.height"
    />
    
    <div class="section" v-for="error in validationErrors">
      <component :is="error.component" :error="error" />
    </div>
  </div>
</template>