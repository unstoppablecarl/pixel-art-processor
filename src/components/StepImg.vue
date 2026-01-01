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

const width = computed(() => {
  const width = image.imageData?.width ?? image.placeholderWidth ?? 7 //store.startStepOutputSize.width
  return width * store.imgScale
})

const height = computed(() => {
  const height = image.imageData?.height ?? image.placeholderHeight ?? 7// store.startStepOutputSize.height
  return height * store.imgScale
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
    class="step-img"
    :src="encoded"
    style="image-rendering: pixelated;"
    :width="width"
    :height="height"
  />
</template>