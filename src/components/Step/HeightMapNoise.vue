<script lang="ts">
import type { StepMeta } from '../../lib/pipeline/StepMeta.ts'

export const STEP_META: StepMeta = {
  def: 'SIMPLEX_NOISE',
  displayName: 'HeightMap Noise',
  inputDataTypes: [HeightMap],
  outputDataType: HeightMap,
}

</script>
<script setup lang="ts">
import { computed, shallowReactive, shallowRef } from 'vue'
import { GENERATE_NOISE_DEFAULTS, generateNoise, mergeHeightMaps } from '../../lib/generators/perlin-noise.ts'
import { useStepHandler } from '../../lib/pipeline/useStepHandler.ts'
import { HeightMap } from '../../lib/step-data-types/HeightMap.ts'
import { useStepStore } from '../../lib/store/step-store.ts'
import StepCard from '../StepCard.vue'

const store = useStepStore()

const { stepId } = defineProps<{ stepId: string }>()

const noiseImageData = shallowRef<ImageData | null>(null)

const step = useStepHandler(stepId, {
  ...STEP_META,
  config() {
    return shallowReactive({
      ...GENERATE_NOISE_DEFAULTS,
    })
  },
  run({ config, inputData }) {
    if (!inputData) return

    noiseImageData.value = generateNoise(inputData.width, inputData.height, config)

    if (config.enabled) {
      const preview = mergeHeightMaps(inputData.toImageData(), noiseImageData.value, (a, b) => {
        return (a + b) / 2
      })
      const output = HeightMap.fromImageData(preview)
      return {
        preview,
        output,
      }
    }
  },
})

const images = computed(() => {
  const step = store.get(stepId)
  return [
    {
      label: 'Noise',
      imageData: noiseImageData.value,
      placeholderWidth: noiseImageData.value?.width,
      placeholderHeight: noiseImageData.value?.height,
    },
    {
      label: 'Output',
      imageData: step.outputPreview,
      placeholderWidth: step.outputPreview?.width,
      placeholderHeight: step.outputPreview?.height,
    },
  ]
})

const config = step.config

</script>
<template>
  <StepCard
    :step="step"
    :images="images"
  >
    <template #header>
      {{ STEP_META.displayName }}
    </template>
    <template #footer>
      <div>
        <div class="form-check">
          <input type="checkbox" class="form-check-input" id="noiseEnabled"
                 v-model="config.enabled" />
          <label class="form-check-label" for="noiseEnabled">Enabled</label>
        </div>
      </div>
      <div>
        <label class="form-label">Seed: {{ config.seed }}</label>
        <input type="range" min="0" max="100" step="1" v-model.number="config.seed"
               class="form-range" />
      </div>
      <div>
        <label class="form-label">Amplitude: {{ config.amplitude.toFixed(1) }}</label>
        <input type="range" min="0.1" max="2" step="0.1" v-model.number="config.amplitude"
               class="form-range" />
      </div>
      <div>
        <label class="form-label">Frequency: {{ config.frequency.toFixed(2) }}</label>
        <input type="range" min="0.001" max="1" step="0.001" v-model.number="config.frequency"
               class="form-range" />
      </div>
      <div>
        <label class="form-label">Octaves: {{ config.octaves }}</label>
        <input type="range" min="1" max="12" step="1" v-model.number="config.octaves"
               class="form-range" />
      </div>
      <div>
        <label class="form-label">Gain: {{ config.gain }}</label>
        <input type="range" min="0.1" max="1" step="0.05" v-model.number="config.gain"
               class="form-range" />
      </div>
      <div>
        <label class="form-label">Lacunarity: {{ config.lacunarity }}</label>
        <input type="range" min="1.5" max="3" step="0.05" v-model.number="config.lacunarity"
               class="form-range" />
      </div>
    </template>
  </StepCard>
</template>