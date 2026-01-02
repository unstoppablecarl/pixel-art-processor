<script lang="ts">
export type StepImage = {
  imageData: ImageData | null,
  label?: string,
  placeholderWidth?: number,
  placeholderHeight?: number,
}
</script>
<script setup lang="ts">
import { computed } from 'vue'
import { usePipelineStore } from '../lib/store/pipeline-store.ts'
import { imageDataToUrlImage } from '../lib/util/ImageData.ts'

const store = usePipelineStore()
const {
  imageData,
  label = '',
  placeholderWidth = 0,
  placeholderHeight = 0,
} = defineProps<{
  imageData: ImageData | null,
  label?: string,
  placeholderWidth?: number,
  placeholderHeight?: number,
}>()

const size = computed(() => {
  const rootSize = store.getRootNodeOutputSize()
  const width = imageData?.width ?? placeholderWidth ?? rootSize.width
  const height = imageData?.height ?? placeholderHeight ?? rootSize.height

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
  <img
    :alt="label"
    class="node-img"
    :src="encoded"
    style="image-rendering: pixelated;"
    :width="size.width"
    :height="size.height"
  />
</template>