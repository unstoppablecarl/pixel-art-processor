<script lang="ts">
import { NodeType } from '../../lib/pipeline/Node.ts'
import type { AnyStepMeta } from '../../lib/pipeline/StepMeta.ts'
import { BitMask } from '../../lib/step-data-types/BitMask.ts'

export const STEP_META: AnyStepMeta = {
  type: NodeType.STEP,
  def: 'bitmask_islands_add',
  displayName: 'BitMask Islands: Add',
  inputDataTypes: [BitMask],
  outputDataType: BitMask,
}

</script>
<script setup lang="ts">
import { addPointsPoissonDisk } from '../../lib/generators/addPointsPoissonDisk.ts'
import {
  DEFAULT_SHOW_ADDED,
  DEFAULT_SHOW_ISLANDS,
  islandCheckboxColors,
} from '../../lib/generators/island-ui.ts'
import type { NodeId } from '../../lib/pipeline/Node.ts'
import { useStepHandler } from '../../lib/pipeline/useStepHandler.ts'
import { parseColorData } from '../../lib/util/color.ts'
import { prng } from '../../lib/util/prng.ts'
import { Sketch } from '../../lib/util/Sketch.ts'
import StepCard from '../StepCard.vue'
import CheckboxColorList from '../UIForms/CheckboxColorList.vue'
import RangeBandSlider from '../UIForms/RangeBandSlider.vue'
import RangeSlider from '../UIForms/RangeSlider.vue'
import { BTab, BTabs } from 'bootstrap-vue-next'

const { nodeId } = defineProps<{ nodeId: NodeId }>()

const node = useStepHandler(nodeId, {
  ...STEP_META,
  config() {
    return {
      minDistance: 4,
      maxDistance: 10,
      borderBuffer: 3,
      tries: 30,
      activeTabIndex: 0,
      populationFactor: 1,
      ...DEFAULT_SHOW_ISLANDS.CONFIG,
      ...DEFAULT_SHOW_ADDED.CONFIG,
    }
  },
  async run({ config, inputData }) {
    if (!inputData) return

    const mask = inputData as BitMask
    const C = config

    const points = addPointsPoissonDisk(
      mask,
      C.minDistance,
      C.maxDistance,
      C.tries,
    ).filter(({ x, y }) => {
      if (mask.isWithinBorder(x, y, C.borderBuffer)) return false
      return prng() <= C.populationFactor
    })

    points.forEach(({ x, y }) => mask.set(x, y, 1))

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

const config = node.config

</script>
<template>
  <StepCard :node="node">
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
            :max="node.outputData?.width ?? 400"
            :step="1"
            label="Min/Max Dist:"
          />

          <RangeSlider
            :id="`${nodeId}-border-buffer`"
            label="Border Buffer"
            v-model:value="config.borderBuffer"
            :min="0"
            :max="node.outputData?.width ?? 400"
            :step="1"
          />

          <RangeSlider
            :id="`${nodeId}-tries`"
            label="Tries"
            v-model:value="config.tries"
            :min="1"
            :max="100"
            :step="1"
          />

          <RangeSlider
            :id="`${nodeId}-population-factor`"
            label="Pop Factor"
            tool-tip="Percentage of points to keep"
            v-model:value="config.populationFactor"
            :decimals="2"
            :min="0"
            :max="1"
            :step="0.01"
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