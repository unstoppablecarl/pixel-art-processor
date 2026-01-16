<script lang="ts">
import { BitMask } from '../../lib/node-data-types/BitMask.ts'
import { type NodeDef, NodeType } from '../../lib/pipeline/_types.ts'
import { defineStep } from '../../lib/pipeline/types/definitions.ts'

export const STEP_META = defineStep({
  type: NodeType.STEP,
  def: 'bitmask_islands_add' as NodeDef,
  displayName: 'BitMask Islands: Add',
  inputDataTypes: [BitMask],
  outputDataType: BitMask,
})

</script>
<script setup lang="ts">
import { addPointsPoissonDisk } from '../../lib/generators/addPointsPoissonDisk.ts'
import {
  DEFAULT_SHOW_ADDED,
  DEFAULT_SHOW_ISLANDS, islandsDrawCheckboxColors,
} from '../../lib/vue/island-ui.ts'
import type { NodeId } from '../../lib/pipeline/_types.ts'
import { defineStepHandler, useStepHandler } from '../../lib/pipeline/NodeHandler/StepHandler.ts'
import { parseColor } from '../../lib/util/color.ts'
import { prng } from '../../lib/util/prng.ts'
import { Sketch } from '../../lib/util/html-dom/Sketch.ts'
import NodeCard from '../Card/NodeCard.vue'
import CardFooterSettingsTabs from '../UI/CardFooterSettingsTabs.vue'
import CheckboxColorList from '../UIForms/CheckboxColorList.vue'
import RangeBandSlider from '../UIForms/RangeBandSlider.vue'
import RangeSlider from '../UIForms/RangeSlider.vue'
import { reactive } from 'vue'

const { nodeId } = defineProps<{ nodeId: NodeId }>()

const handler = defineStepHandler(STEP_META, {
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
  reactiveConfig: reactive,
  async run({ config, inputData }) {
    if (!inputData) return

    const mask = inputData.copy()
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
    const islandColor = parseColor(C.showIslandColor)

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
const node = useStepHandler(nodeId, handler)

const config = node.config
</script>
<template>
  <NodeCard :node="node">
    <template #footer>

      <CardFooterSettingsTabs
        :node-id="nodeId"
        v-model:active-tab-index="config.activeTabIndex"
      >
        <template #settings>
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
        </template>
        <template #display-options>
          <CheckboxColorList :items="islandsDrawCheckboxColors(config)" />
        </template>
      </CardFooterSettingsTabs>
    </template>
  </NodeCard>
</template>