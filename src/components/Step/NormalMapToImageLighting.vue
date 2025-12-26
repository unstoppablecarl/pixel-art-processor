<script lang="ts">
import { StepType } from '../../lib/pipeline/Step.ts'
import type { StepMeta } from '../../lib/pipeline/StepMeta.ts'

export const STEP_META: StepMeta = {
  type: StepType.NORMAL,
  def: 'normal_map_to_texture_lighting',
  displayName: 'NormalMap -> Texture Lighting',
  inputDataTypes: [NormalMap],
  outputDataType: PixelMap,
}

</script>
<script setup lang="ts">
import { computed, ref, shallowReactive } from 'vue'
import { useStepHandler } from '../../lib/pipeline/useStepHandler.ts'
import { NormalMap } from '../../lib/step-data-types/NormalMap.ts'
import { PixelMap } from '../../lib/step-data-types/PixelMap.ts'
import { useStepStore } from '../../lib/store/step-store.ts'
import { arrayBufferToImageData, getFileAsArrayBuffer } from '../../lib/util/file-upload.ts'
import { deserializeImageData, serializeImageData } from '../../lib/util/ImageData.ts'
import StepCard from '../StepCard.vue'
import RangeSlider from '../UIForms/RangeSlider.vue'

const { stepId } = defineProps<{ stepId: string }>()

const step = useStepHandler(stepId, {
  ...STEP_META,
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

    const result = inputData.applyLighting(
      config.textureImageData,
      config.lightX,
      config.lightY,
      config.lightZ,
    )

    return {
      output: result,
      preview: result.toImageData(),
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
    imageData: step.outputPreview,
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
    <template #footer>
      <div class="section">
        <input ref="textureInputEl" type="file" accept="image/*" @change="handleTextureUpload" class="form-control" />
      </div>

      <div class="section">
        <div class="section-heading">
          Light Direction
        </div>

        <RangeSlider
          :id="`${stepId}-lightX`"
          label="X"
          :decimals="1"
          v-model:value="config.lightX"
          :min="-2"
          :max="2"
          :step="0.1"
        />


        <RangeSlider
          :id="`${stepId}-lightY`"
          label="Y"
          :decimals="1"
          v-model:value="config.lightY"
          :min="-2"
          :max="2"
          :step="0.1"
        />

        <RangeSlider
          :id="`${stepId}-lightZ`"
          label="Z"
          :decimals="1"
          v-model:value="config.lightZ"
          :min="-2"
          :max="2"
          :step="0.1"
        />
      </div>
    </template>
  </StepCard>
</template>