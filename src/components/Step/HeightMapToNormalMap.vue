<script lang="ts">
import { NodeType } from '../../lib/pipeline/Node.ts'
import type { AnyStepMeta } from '../../lib/pipeline/StepMeta.ts'
import { HeightMap } from '../../lib/step-data-types/HeightMap.ts'
import { NormalMap } from '../../lib/step-data-types/NormalMap.ts'

export const STEP_META: AnyStepMeta = {
  type: NodeType.STEP,
  def: 'height_map_to_normal_map',
  displayName: 'HeightMap -> NormalMap',
  inputDataTypes: [HeightMap],
  outputDataType: NormalMap,
}

</script>
<script setup lang="ts">
import type { NodeId } from '../../lib/pipeline/Node.ts'
import { useStepHandler } from '../../lib/pipeline/useStepHandler.ts'
import StepCard from '../StepCard.vue'
import RangeSlider from '../UIForms/RangeSlider.vue'

const { nodeId } = defineProps<{ nodeId: NodeId }>()

const node = useStepHandler(nodeId, {
  ...STEP_META,
  config() {
    return {
      normalMapStrength: 1.5,
    }
  },
  async run({ config, inputData }) {
    if (!inputData) return

    const heightMap = inputData as HeightMap

    const normalMap = heightMap.toNormalMap(config.normalMapStrength)
    return {
      output: normalMap,
      preview: normalMap.toImageData(),
    }
  },
})
const config = node.config
</script>
<template>
  <StepCard :node="node">
    <template #footer>
      <div class="section">
        <RangeSlider
          :id="`${nodeId}-normalMapStrength`"
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