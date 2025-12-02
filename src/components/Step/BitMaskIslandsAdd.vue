<script setup lang="ts">
import { shallowReactive } from 'vue'
import { addRandomInnerPoints } from '../../lib/data/PointSet.ts'
import { useStepHandler } from '../../lib/pipeline/useStepHandler.ts'
import { BitMask } from '../../lib/step-data-types/BitMask.ts'
import StepCard from '../StepCard.vue'

const { stepId } = defineProps<{ stepId: string }>()

const step = useStepHandler(stepId, {
  inputDataTypes: [BitMask],
  outputDataType: BitMask,
  config() {
    return shallowReactive({
      minDistance: 4,
      maxDistance: 10,
    })
  },
  run({ config, inputData }) {
    if (!inputData) return

    const mask = inputData as BitMask
    const C = config

    addRandomInnerPoints(mask, C.minDistance, C.maxDistance)

    return {
      output: mask,
      preview: mask.toImageData(),
    }
  },
})

const config = step.config

</script>
<template>
  <StepCard
    :step="step"
  >
    <template #header>
      BitMsk Add Islands
    </template>
    <template #footer>
      <div>
        <label class="form-label">Min Dist: {{ config.minDistance }}</label>
        <input type="range" min="1" max="20" step="1" v-model.number="config.minDistance"
               class="form-range" />
      </div>
      <div>
        <label class="form-label">Max Dist: {{ config.maxDistance }}</label>
        <input type="range" min="1" max="20" step="1" v-model.number="config.maxDistance"
               class="form-range" />
      </div>

    </template>
  </StepCard>
</template>