<script lang="ts">
import type { StepMeta } from '../../lib/pipeline/StepMeta.ts'

export const STEP_META: StepMeta = {
  def: 'height_map_to_normal_map',
  displayName: 'Height Map -> Normal Map',
  inputDataTypes: [HeightMap],
  outputDataType: NormalMap,
}

</script>
<script setup lang="ts">
import { shallowReactive } from 'vue'
import { useStepHandler } from '../../lib/pipeline/useStepHandler.ts'
import { HeightMap } from '../../lib/step-data-types/HeightMap.ts'
import { NormalMap } from '../../lib/step-data-types/NormalMap.ts'
import StepCard from '../StepCard.vue'

const { stepId } = defineProps<{ stepId: string }>()

const step = useStepHandler(stepId, {
  ...STEP_META,
  config() {
    return shallowReactive({
      normalMapStrength: 1.5,
    })
  },
  run({ config, inputData }) {
    if (!inputData) return

    const heightMap = inputData as HeightMap

    const normalMap = heightMap.toNormalMap(config.normalMapStrength)
    return {
      output: normalMap,
      preview: normalMap.toImageData(),
    }
  },
})
const config = step.config
</script>
<template>
  <StepCard :step="step">
    <template #header>
      Normal Map
    </template>
    <template #footer>
      <div>
        <label class="form-label">Strength: {{ config.normalMapStrength.toFixed(1) }}</label>
        <input type="range" min="0.1" max="20" step="0.1" v-model.number="config.normalMapStrength"
               class="form-range" />
      </div>
    </template>
  </StepCard>
</template>