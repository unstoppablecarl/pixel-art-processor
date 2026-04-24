<script lang="ts">
import { BitMask } from '../../lib/node-data-types/BitMask.ts'
import { type NodeDef, NodeType } from '../../lib/pipeline/_types.ts'
import { defineStep } from '../../lib/pipeline/types/definitions.ts'

export const STEP_META = defineStep({
  type: NodeType.STEP,
  def: 'bitmask_blank' as NodeDef,
  displayName: 'BitMask: Blank',
  noInput: true,
  outputDataType: BitMask,
})
</script>
<script setup lang="ts">
import type { NodeId } from '../../lib/pipeline/_types.ts'
import { defineStepHandler, useStepHandler } from '../../lib/pipeline/NodeHandler/StepHandler.ts'
import NodeCard from '../Card/NodeCard.vue'
import { rangeSliderConfig } from '../UIForms/RangeSlider.ts'
import RangeSlider from '../UIForms/RangeSlider.vue'

const { nodeId } = defineProps<{ nodeId: NodeId }>()

const CONFIG_DEFAULTS = {
  size: rangeSliderConfig({
    value: 64,
    min: 8,
    max: 512,
  }),
}

const handler = defineStepHandler(STEP_META, {
  config() {
    return {
      ...CONFIG_DEFAULTS,
    }
  },
  async run({ config }) {
    const size = config.size
    const mask = new BitMask(size.value, size.value)

    return {
      output: mask,
      preview: mask.toImageData(),
    }
  },
})

const node = useStepHandler(nodeId, handler)

const config = node.config!
</script>
<template>
  <NodeCard :node="node" show-dimensions>
    <template #footer>

      <div class="section">

        <RangeSlider
          :id="`${nodeId}-size`"
          label="Size"
          :defaults="CONFIG_DEFAULTS.size"
          v-model:value="config.size.value"
          v-model:min="config.size.min"
          v-model:max="config.size.max"
          v-model:step="config.size.step"
        />

      </div>
    </template>
  </NodeCard>
</template>