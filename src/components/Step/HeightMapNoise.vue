<script lang="ts">
import { NodeType } from '../../lib/pipeline/Node.ts'
import type { AnyStepMeta } from '../../lib/pipeline/StepMeta.ts'

export const STEP_META: AnyStepMeta = {
  type: NodeType.STEP,
  def: 'height_map_noise',
  displayName: 'HeightMap: Noise',
  inputDataTypes: [HeightMap],
  outputDataType: HeightMap,
}

</script>
<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { GENERATE_NOISE_DEFAULTS, generateNoise, mergeHeightMaps } from '../../lib/generators/perlin-noise.ts'
import type { NodeId } from '../../lib/pipeline/Node.ts'
import { useStepHandler } from '../../lib/pipeline/useStepHandler.ts'
import { HeightMap } from '../../lib/step-data-types/HeightMap.ts'
import { usePipelineStore } from '../../lib/store/pipeline-store.ts'
import StepCard from '../StepCard.vue'
import RangeSlider from '../UIForms/RangeSlider.vue'

const store = usePipelineStore()

const { nodeId } = defineProps<{ nodeId: NodeId }>()

const noiseImageData = shallowRef<ImageData | null>(null)

const node = useStepHandler(nodeId, {
  ...STEP_META,
  config() {
    return {
      ...GENERATE_NOISE_DEFAULTS,
    }
  },
  async run({ config, inputData }) {
    if (!inputData) return

    noiseImageData.value = generateNoise(inputData.width, inputData.height, config)

    const preview = mergeHeightMaps(inputData.toImageData(), noiseImageData.value, (a, b) => {
      return (a + b) / 2
    })
    const output = HeightMap.fromImageData(preview)
    return {
      preview,
      output,
    }
  },
})

const images = computed(() => {
  const node = store.get(nodeId)
  const outputPreview = node.outputPreview as ImageData | null
  return [
    {
      label: 'Noise',
      imageData: noiseImageData.value,
      placeholderWidth: noiseImageData.value?.width,
      placeholderHeight: noiseImageData.value?.height,
    },
    {
      label: 'Output',
      imageData: outputPreview,
      placeholderWidth: outputPreview?.width,
      placeholderHeight: outputPreview?.height,
    },
  ]
})

const config = node.config

</script>
<template>
  <StepCard
    :node="node"
    :images="images"
  >
    <template #footer>
      <div class="section">

        <RangeSlider
          :id="`${nodeId}-amplitude`"
          label="Amplitude"
          :decimals="1"
          v-model:value="config.amplitude"
          :min="0.1"
          :max="2"
          :step="0.1"
        />

        <RangeSlider
          :id="`${nodeId}-frequency`"
          label="Frequency"
          :decimals="2"
          v-model:value="config.frequency"
          :min="0.001"
          :max="1"
          :step="0.001"
        />

        <RangeSlider
          :id="`${nodeId}-octaves`"
          label="Octaves"
          v-model:value="config.octaves"
          :min="1"
          :max="12"
          :step="1"
        />

        <RangeSlider
          :id="`${nodeId}-gain`"
          label="Gain"
          v-model:value="config.gain"
          :min="0.1"
          :max="12"
          :step="0.05"
        />

        <RangeSlider
          :id="`${nodeId}-lacunarity`"
          label="Lacunarity"
          v-model:value="config.lacunarity"
          :min="1.5"
          :max="3"
          :step="0.05"
        />
      </div>
    </template>
  </StepCard>
</template>