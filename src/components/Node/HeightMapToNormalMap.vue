<script lang="ts">
import { HeightMap } from '../../lib/node-data-types/HeightMap.ts'
import { NormalMap } from '../../lib/node-data-types/NormalMap.ts'
import { type NodeDef, NodeType } from '../../lib/pipeline/_types.ts'
import { defineStep } from '../../lib/pipeline/types/definitions.ts'

export const STEP_META = defineStep({
  type: NodeType.STEP,
  def: 'height_map_to_normal_map' as NodeDef,
  displayName: 'HeightMap -> NormalMap',
  inputDataTypes: [HeightMap],
  outputDataType: NormalMap,
})
</script>
<script setup lang="ts">
import type { NodeId } from '../../lib/pipeline/_types.ts'
import { defineStepHandler, useStepHandler } from '../../lib/pipeline/NodeHandler/StepHandler.ts'
import { heightMapToNormalMap } from '../../lib/node-data-types/_data-type-converters.ts'
import NodeCard from '../Card/NodeCard.vue'
import RangeSlider from '../UIForms/RangeSlider.vue'

const { nodeId } = defineProps<{ nodeId: NodeId }>()

const handler = defineStepHandler(STEP_META, {
  config() {
    return {
      normalMapStrength: 1.5,
    }
  },
  async run({ config, inputData }) {
    if (!inputData) return

    const normalMap = heightMapToNormalMap(inputData, config.normalMapStrength)
    return {
      output: normalMap,
      preview: normalMap.toImageData(),
    }
  },
})
const node = useStepHandler(nodeId, handler)

const config = node.config
</script>
<template>
  <NodeCard :node="node">
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
  </NodeCard>
</template>