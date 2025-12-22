<script setup lang="ts">
import { computed } from 'vue'
import { useScaleStore } from '../../lib/store/scale-store.ts'
import { useStepStore } from '../../lib/store/step-store.ts'
import { imageDataToUrlImage } from '../../lib/util/ImageData.ts'

const scaleStore = useScaleStore()
const store = useStepStore()

const cssStyle = computed(() => {

  const imgData = store.finalPreview

  let width = 0
  let height = 0
  let encoded = ''

  if (imgData !== null) {
    width = imgData.width * scaleStore.previewScale
    height = imgData.height * scaleStore.previewScale
    encoded = imageDataToUrlImage(imgData)
  }

  return [
    `--step-img-final-preview: url(${encoded});`,
    `--step-img-final-preview-size: ${width}px ${height}px;`,
  ].join(' ')
})
</script>
<template>
  <div class="" :style="cssStyle">
    <div class="w-100 d-flex flex-nowrap p-3 bg-dark border-top border-bottom">
      <div class="fw-bold me-3">
        Pattern Preview
      </div>

      <div class="form-group d-flex align-items-center gap-2 mb-0">
        <label
          for="scale"
          class="form-label form-label-sm mb-0 text-nowrap"
          style="width: 50px;"
        >
          Scale: {{ scaleStore.previewScale }}
        </label>
        <input type="range"
               class="form-range form-range-sm"
               id="scale"
               min="1"
               max="10"
               step="1"
               style="width: 150px;"
               v-model.number="scaleStore.previewScale"
        >
      </div>

    </div>
    <div
      class="min-vh-100 final-preview">

    </div>
  </div>
</template>
<style lang="scss">

.final-preview {
  background-image: var(--step-img-final-preview);
  background-size: var(--step-img-final-preview-size);

  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

</style>
