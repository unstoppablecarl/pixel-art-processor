<script setup lang="ts">
import { computed, ref, shallowReactive } from 'vue'
import { applyLighting } from '../../lib/ImageData/normal-map.ts'
import { useStepHandler } from '../../lib/pipeline/useStepHandler.ts'
import { NormalMap } from '../../lib/step-data-types/NormalMap.ts'
import { useStepStore } from '../../lib/store/step-store.ts'
import { arrayBufferToImageData, getFileAsArrayBuffer } from '../../lib/util/file-upload.ts'
import { deserializeImageData, serializeImageData } from '../../lib/util/ImageData.ts'
import StepCard from '../StepCard.vue'

const { stepId } = defineProps<{ stepId: string }>()

const step = useStepHandler(stepId, {
  inputDataTypes: [NormalMap],
  outputDataType: ImageData,
  config() {
    return shallowReactive({
      lightX: 0.5,
      lightY: -0.5,
      lightZ: 1,
      textureImageData: null as null | ImageData,
    })
  },
  run({ config, inputData }) {
    if (!inputData) return
    if (!config.textureImageData) return

    const result = applyLighting(
      config.textureImageData,
      inputData,
      config.lightX,
      config.lightY,
      config.lightZ,
    )

    return {
      output: result,
      preview: result,
    }
  },
  serializeConfig(config) {
    return {
      ...config,
      textureImageData: serializeImageData(config.textureImageData),
    }
  },
  deserializeConfig(config) {
    return {
      ...config,
      textureImageData: deserializeImageData(config.textureImageData),
    }
  },
})

const textureInputEl = ref<HTMLInputElement | null>(null)

function handleTextureUpload(e: Event) {
  getFileAsArrayBuffer(e)
    .then(arrayBufferToImageData)
    .then((imageData) => {
      config.textureImageData = imageData
    })
    .catch(error => useStepStore().handleStepError(stepId, error))
}

const images = computed(() => [
  {
    label: 'Texture',
    imageData: config.textureImageData,
  },
  {
    label: 'Output',
    imageData: step.outputData,
    placeholderWidth: config.textureImageData?.width,
    placeholderHeight: config.textureImageData?.height,
  },
])
// onMounted(async () => {
//   await nextTick()
//   setTestFileInput(textureInputEl.value, TEST_TEXTURE_DATA)
// })
const config = step.config
</script>
<template>
  <StepCard
    :step="step"
    :images="images"
    :show-dimensions="true"
  >
    <template #header>
      Normal Lighting
    </template>
    <template #footer>
      <h6>
        Light Direction
      </h6>
      <label class="form-label">X: {{ config.lightX.toFixed(1) }}</label>
      <input type="range" min="-2" max="2" step="0.1" v-model.number="config.lightX" class="form-range" />

      <label class="form-label">Y: {{ config.lightY.toFixed(1) }}</label>
      <input type="range" min="-2" max="2" step="0.1" v-model.number="config.lightY" class="form-range" />

      <label class="form-label">Distance: {{ config.lightZ.toFixed(1) }}</label>
      <input type="range" min="0.1" max="2" step="0.1" v-model.number="config.lightZ" class="form-range" />

      <h6>
        Texture
      </h6>

      <input ref="textureInputEl" type="file" accept="image/*" @change="handleTextureUpload"
             class="form-control" />
    </template>
  </StepCard>
</template>