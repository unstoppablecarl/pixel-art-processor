<script lang="ts">
import { type NodeDef, NodeType } from '../../lib/pipeline/_types.ts'
import { defineStep } from '../../lib/pipeline/types/definitions.ts'

export const STEP_META = defineStep({
  type: NodeType.STEP,
  def: 'repeat_prev_node' as NodeDef,
  displayName: 'Repeat: Prev node',
  passthrough: true,
})
</script>
<script setup lang="ts">
import type { NodeId } from '../../lib/pipeline/_types.ts'
import { GenericValidationError } from '../../lib/pipeline/errors/GenericValidationError.ts'
import { type InitializedNode, isStep } from '../../lib/pipeline/Node.ts'
import { defineStepHandler, useStepHandler } from '../../lib/pipeline/NodeHandler/StepHandler.ts'
import { isNormalMeta } from '../../lib/pipeline/types/definitions.ts'
import { usePipelineStore } from '../../lib/store/pipeline-store.ts'
import NodeCard from '../Card/NodeCard.vue'
import { rangeSliderConfig } from '../UIForms/RangeSlider.ts'
import RangeSlider from '../UIForms/RangeSlider.vue'

const { nodeId } = defineProps<{ nodeId: NodeId }>()

const CONFIG_DEFAULTS = {
  repeatCount: rangeSliderConfig({
    value: 1,
    min: 0,
    max: 100,
  }),
}

const store = usePipelineStore()

const handler = defineStepHandler(STEP_META, {
  config() {
    return {
      ...CONFIG_DEFAULTS,
    }
  },
  validateInput() {
    const prev = node.getPrev(store) as InitializedNode<any, any, any>
    if (!prev) return []
    const meta = prev.handler!.meta
    if (isNormalMeta(meta)) {
      const inputDataTypes = meta.inputDataTypes
      const outputDataType = prev.handler.currentOutputDataType
      if (!inputDataTypes.includes(outputDataType)) {
        return [
          new GenericValidationError(
            'invalid prev node must have same input and output data types',
          ),
        ]
      }
    }
    return []
  },
  async run({ inputData, config }) {

    const prev = node.getPrev(store)
    if (!prev) return

    let output: typeof inputData = inputData

    if (isStep(prev)) {
      const prevConfig = prev.config

      let nextInput = inputData
      for (let i = 0; i < config.repeatCount.value; i++) {
        const result = await prev.runRaw({
          config: prevConfig,
          inputData: nextInput,
          inputPreview: null,
          meta: null,
        })
        output = result.output
        nextInput = result.output
      }
    }

    return {
      output,
      preview: output?.toImageData(),
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
          :id="`${nodeId}-repeat`"
          label="Repeat"
          :defaults="CONFIG_DEFAULTS.repeatCount"
          v-model:value="config.repeatCount.value"
          v-model:min="config.repeatCount.min"
          v-model:max="config.repeatCount.max"
          v-model:step="config.repeatCount.step"
        />

      </div>
    </template>
  </NodeCard>
</template>