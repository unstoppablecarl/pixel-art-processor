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
import { imageDataToUrlImage } from '../lib/util/ImageData.ts'
import { useScaleStore } from '../lib/store/scale-store.ts'

const store = useScaleStore()
const {
  image,
} = defineProps<{
  image: StepImage,
}>()

const width = computed(() => {
  const width = image.imageData?.width ?? image.placeholderWidth ?? 100
  return width * store.scale
})

const height = computed(() => {
  const height = image.imageData?.height ?? image.placeholderHeight ?? 100
  return height * store.scale
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