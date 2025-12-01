<script setup lang="ts">
import { shallowReactive } from 'vue'
import { useStepHandler } from '../../lib/pipeline/useStepHandler.ts'
import { BitMask } from '../../lib/step-data-types/BitMask.ts'
import StepCard from '../StepCard.vue'

const { stepId } = defineProps<{ stepId: string }>()

const step = useStepHandler(stepId, {
  inputDataTypes: [],
  outputDataType: BitMask,
  config() {
    return shallowReactive({
      size: 64,
    })
  },
  run({ config }) {
    const size = config.size
    const mask = new BitMask(size, size)
    mask.setRect(10, 0, 8, 1, 1)
    mask.setRect(0, 15, 1, 17, 1)
    mask.setRect(size - 1, 20, 1, 12, 1)
    mask.setRect(13, size - 1, 18, 1, 1)

    return {
      output: mask,
      preview: mask.toImageData({ r: 255, g: 255, b: 255, a: 255 }),
    }
  },
})

const config = step.config!

</script>
<template>
  <StepCard :step="step">
    <template #header>
      BitMsk Island Edges
    </template>
    <template #footer>
      <div>
        <label class="form-label">Size: {{ config.size }}</label>
        <input type="range" min="32" max="128" step="1" v-model.number="config.size"
               class="form-range" />
      </div>
    </template>
  </StepCard>
</template>