<script lang="ts">
import type { StepMeta } from '../../lib/pipeline/StepMeta.ts'

export const STEP_META: StepMeta = {
  def: 'height_map_glow',
  displayName: 'HeightMap: Glow',
  inputDataTypes: [BitMask],
  outputDataType: HeightMap,
}

</script>
<script setup lang="ts">
import { reactive } from 'vue'
import { applyInnerGlow, INNER_GLOW_DEFAULTS, type InnerGlowOptions } from '../../lib/generators/inner-glow.ts'
import { useStepHandler } from '../../lib/pipeline/useStepHandler.ts'
import { BitMask } from '../../lib/step-data-types/BitMask.ts'
import { HeightMap } from '../../lib/step-data-types/HeightMap.ts'
import { fillNonTransparentPixels, fillTransparentPixels } from '../../lib/util/ImageData.ts'
import RangeBandSlider from '../UI/RangeBandSlider.vue'
import StepCard from '../StepCard.vue'

const { stepId } = defineProps<{ stepId: string }>()

const step = useStepHandler(stepId, {
  ...STEP_META,
  config() {
    return reactive<InnerGlowOptions>({
      ...INNER_GLOW_DEFAULTS,
    })
  },
  run({ config, inputData }) {
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

const config = step.config
</script>
<template>
  <StepCard :step="step">
    <template #footer>
      <div class="form-check">
        <input class="form-check-input" type="checkbox" value="" id="fromCenter"
               v-model="config.fromCenter" />
        <label class="form-check-label" for="fromCenter">
          From Center
        </label>
      </div>

      <div>
        <label class="form-label">Size: {{ config.size?.toFixed(1) }}</label>
        <input type="range" min="0" max="20" step="1" v-model.number="config.size"
               class="form-range" />
      </div>
      <div>
        <label class="form-label">Choke: {{ config.choke?.toFixed(2) }}</label>
        <input type="range"
               class="form-range"
               min="0"
               max="1"
               step="0.05"
               v-model.number="config.choke"
        />
      </div>

      <RangeBandSlider
        v-model:minValue="config.startHeight "
        v-model:maxValue="config.endHeight "
        :show-inputs="false"
        :min="0"
        :max="255"
        :step="1"
        :label="`Start/End Height: ${config.startHeight}-${config.endHeight}`"
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
    </template>
  </StepCard>
</template>