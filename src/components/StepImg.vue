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
  image,
} = defineProps<{
  image: StepImage,
}>()

const size = computed(() => {
  const rootSize = store.getRootNodeOutputSize()
  const width = image.imageData?.width ?? image.placeholderWidth ?? rootSize.width
  const height = image.imageData?.height ?? image.placeholderHeight ?? rootSize.height

  return {
    width: width * store.imgScale,
    height: height * store.imgScale,
  }
})

const encoded = computed(() => {
  if (!image.imageData) {
    return '/placeholder.png'
  }
  return imageDataToUrlImage(image.imageData)
})

</script>
<template>
  <img
    :alt="image.label"
    class="node-img"
    :src="encoded"
    style="image-rendering: pixelated;"
    :width="size.width"
    :height="size.height"
  />
</template>