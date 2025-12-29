<script lang="ts">
import { StepType } from '../../lib/pipeline/Step.ts'
import type { StepMeta } from '../../lib/pipeline/StepMeta.ts'
import { HeightMap } from '../../lib/step-data-types/HeightMap.ts'
import { NormalMap } from '../../lib/step-data-types/NormalMap.ts'

export const STEP_META: StepMeta = {
  type: StepType.NORMAL,
  def: 'height_map_to_normal_map',
  displayName: 'HeightMap -> NormalMap',
  inputDataTypes: [HeightMap],
  outputDataType: NormalMap,
}

</script>
<script setup lang="ts">
import { useStepHandler } from '../../lib/pipeline/useStepHandler.ts'
import StepCard from '../StepCard.vue'
import RangeSlider from '../UIForms/RangeSlider.vue'

const { stepId } = defineProps<{ stepId: string }>()

const step = useStepHandler(stepId, {
  ...STEP_META,
  config() {
    return {
      normalMapStrength: 1.5,
    }
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
    <template #footer>
      <div class="section">
        <RangeSlider
          :id="`${stepId}-normalMapStrength`"
          label="Strength"
          v-model:value="config.normalMapStrength"
          :min="0"
          :max="20"
          :step="0.1"
        />
      </div>
    </template>
  </StepCard>
</template>