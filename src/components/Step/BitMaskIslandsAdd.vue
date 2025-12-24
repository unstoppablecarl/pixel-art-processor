<script lang="ts">
import type { StepMeta } from '../../lib/pipeline/StepMeta.ts'

export const STEP_META: StepMeta = {
  def: 'bitmask_add_islands',
  displayName: 'BitMask Add Islands',
  inputDataTypes: [BitMask],
  outputDataType: BitMask,
}

</script>
<script setup lang="ts">
import { shallowReactive } from 'vue'
import { addRandomInnerPoints } from '../../lib/data/PointSet.ts'
import {
  DEFAULT_SHOW_ADDED,
  DEFAULT_SHOW_ISLANDS,
  islandCheckboxColors,
} from '../../lib/generators/island-ui.ts'
import { useStepHandler } from '../../lib/pipeline/useStepHandler.ts'
import { BitMask } from '../../lib/step-data-types/BitMask.ts'
import { parseColorData } from '../../lib/util/color.ts'
import { Sketch } from '../../lib/util/Sketch.ts'
import StepCard from '../StepCard.vue'
import CheckboxColorList from '../UI/CheckboxColorList.vue'
import RangeBandSlider from '../UI/RangeBandSlider.vue'
import RangeSlider from '../UI/RangeSlider.vue'
import { BTab, BTabs } from 'bootstrap-vue-next'

const { stepId } = defineProps<{ stepId: string }>()

const step = useStepHandler(stepId, {
  ...STEP_META,
  config() {
    return shallowReactive({
      minDistance: 4,
      maxDistance: 10,
      borderBuffer: 3,
      tries: 30,
      activeTabIndex: 0,
      ...DEFAULT_SHOW_ISLANDS.CONFIG,
      ...DEFAULT_SHOW_ADDED.CONFIG,
    })
  },
  run({ config, inputData }) {
    if (!inputData) return

    const mask = inputData as BitMask
    const C = config

    const points = addRandomInnerPoints(
      mask,
      C.minDistance,
      C.maxDistance,
      C.tries,
      C.borderBuffer,
    )

    points.forEach(({ x, y }) => {
      mask.set(x, y, 1)
    })

    const sketch = new Sketch(mask.width, mask.height)
    const islandColor = parseColorData(C.showIslandColor)

    if (C.showIsland) {
      sketch.putImageData(mask.toImageData(islandColor))
    }

    if (C.showAdded) {
      points.forEach(({ x, y }) => {
        sketch.setPixel(x, y, config.showAddedColor)
      })
    }

    return {
      output: mask,
      preview: sketch.toImageData(),
    }
  },
})

const config = step.config

</script>
<template>
  <StepCard :step="step" :footer-tabs="true">
    <template #footer>
      <BTabs
        content-class="mt-3 p-2"
        v-model:index="config.activeTabIndex"
      >
        <BTab
          title="Settings"
          id="settings"
        >
          <RangeBandSlider
            v-model:minValue="config.minDistance "
            v-model:maxValue="config.maxDistance "
            :show-inputs="false"
            :min="0"
            :max="step.inputData?.width ?? 400"
            :step="1"
            label="Min/Max Dist:"
          />

          <RangeSlider
            :id="`${stepId}-border-buffer`"
            label="Border Buffer"
            v-model:value="config.borderBuffer"
            :min="0"
            :max="step.inputData?.width"
            :step="1"
          />

          <RangeSlider
            :id="`${stepId}-tries`"
            label="Tries"
            v-model:value="config.tries"
            :min="1"
            :max="100"
            :step="1"
          />

        </BTab>
        <BTab
          title="Display"
          id="display"
        >
          <CheckboxColorList :items="islandCheckboxColors(config)" />
        </BTab>
      </BTabs>
    </template>
  </StepCard>
</template>