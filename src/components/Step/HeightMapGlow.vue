<script lang="ts">
import { NodeType } from '../../lib/pipeline/Node.ts'
import type { AnyStepMeta } from '../../lib/pipeline/StepMeta.ts'

export const STEP_META: AnyStepMeta = {
  type: NodeType.STEP,
  def: 'height_map_glow',
  displayName: 'HeightMap: Glow',
  inputDataTypes: [BitMask],
  outputDataType: HeightMap,
}

</script>
<script setup lang="ts">
import { applyInnerGlow, INNER_GLOW_DEFAULTS } from '../../lib/generators/inner-glow.ts'
import type { NodeId } from '../../lib/pipeline/Node.ts'
import { useStepHandler } from '../../lib/pipeline/useStepHandler.ts'
import { BitMask } from '../../lib/step-data-types/BitMask.ts'
import { HeightMap } from '../../lib/step-data-types/HeightMap.ts'
import { fillNonTransparentPixels, fillTransparentPixels } from '../../lib/util/ImageData.ts'
import CheckBoxInput from '../UIForms/CheckBoxInput.vue'
import RangeBandSlider from '../UIForms/RangeBandSlider.vue'
import StepCard from '../StepCard.vue'
import RangeSlider from '../UIForms/RangeSlider.vue'

const { nodeId } = defineProps<{ nodeId: NodeId }>()

const node = useStepHandler(nodeId, {
  ...STEP_META,
  config() {
    return {
      ...INNER_GLOW_DEFAULTS,
    }
  },
  async run({ config, inputData }) {
    if (inputData === null) return

    const bitMask = inputData as BitMask

    let imageData = fillNonTransparentPixels(bitMask.toImageData(), 255)
    imageData = applyInnerGlow(imageData, config)
    if (config.fillTransparent) {
      fillTransparentPixels(imageData, config.fillTransparentValue)
    }

    return {
      preview: imageData,
      output: HeightMap.fromImageData(imageData),
    }
  },
})

const config = node.config
</script>
<template>
  <StepCard :node="node">
    <template #footer>
      <div class="section">
        <CheckBoxInput
          :id="`${nodeId}-from-center`"
          label="From Center"
          v-model="config.fromCenter"
        />

        <RangeSlider
          :id="`${nodeId}-size`"
          label="Size"
          v-model:value="config.size"
          :min="0"
          :max="Math.floor((node.outputData?.width ?? 0) * 0.5)"
          :step="1"
        />

        <RangeSlider
          :id="`${nodeId}-choke`"
          label="Choke"
          v-model:value="config.choke"
          :decimals="2"
          :min="0"
          :max="1"
          :step="0.05"
        />

        <RangeBandSlider
          v-model:minValue="config.startHeight "
          v-model:maxValue="config.endHeight "
          :show-inputs="false"
          :min="0"
          :max="255"
          :step="1"
          :label="`Start/End Height`"
        />

        <div class="form-check">
          <input type="checkbox" class="form-check-input" id="fillTransparent" v-model="config.fillTransparent" />
          <label class="form-check-label" for="fillTransparent">Fill Transparent</label>
        </div>

        <div v-if="config.fillTransparent">
          <label class="form-label">Fill Value: {{ config.fillTransparentValue }}</label>
          <input type="range"
                 class="form-range"
                 min="0"
                 max="255"
                 step="1"
                 v-model.number="config.fillTransparentValue"
          />
        </div>
      </div>
    </template>
  </StepCard>
</template>