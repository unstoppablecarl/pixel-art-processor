<script lang="ts">
import { NodeType } from '../../lib/pipeline/_types.ts'
import { defineNodeMeta } from '../../lib/pipeline/types/definitions.ts'
import { BitMask } from '../../lib/step-data-types/BitMask.ts'

export const STEP_META = defineNodeMeta({
  type: NodeType.STEP,
  def: 'bitmask_islands_add',
  displayName: 'BitMask Islands: Add',
  inputDataTypes: [BitMask],
  outputDataType: BitMask,
})

</script>
<script setup lang="ts">
import { addPointsPoissonDisk } from '../../lib/generators/addPointsPoissonDisk.ts'
import {
  DEFAULT_SHOW_ADDED,
  DEFAULT_SHOW_ISLANDS,
  islandCheckboxColors,
} from '../../lib/generators/island-ui.ts'
import type { NodeId } from '../../lib/pipeline/_types.ts'
import { defineStepHandler } from '../../lib/pipeline/NodeHandler/StepHandler.ts'
import { useStepHandler } from '../../lib/pipeline/NodeHandler/useHandlers.ts'
import { parseColorData } from '../../lib/util/color.ts'
import { prng } from '../../lib/util/prng.ts'
import { Sketch } from '../../lib/util/Sketch.ts'
import StepCard from '../Card/StepCard.vue'
import CheckboxColorList from '../UIForms/CheckboxColorList.vue'
import RangeBandSlider from '../UIForms/RangeBandSlider.vue'
import RangeSlider from '../UIForms/RangeSlider.vue'
import { BTab, BTabs } from 'bootstrap-vue-next'
import { reactive, ref } from 'vue'

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

    const mask = inputData.copy() as BitMask
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
const node = useStepHandler(nodeId, STEP_META, handler)

const config = node.config
const settingsVisible = ref(true)

function toggleExpand() {
  if (!settingsVisible.value) {
    config.activeTabIndex = 0
  }
  settingsVisible.value = !settingsVisible.value
}
</script>
<template>
  <StepCard :node="node">
    <template #footer>
      <BTabs
        v-model:index="config.activeTabIndex"
        no-body
      >
        <BTab
          :id="`${nodeId}-settings`"
          title="Settings"
        />

        <BTab
          :id="`${nodeId}-display`"
          title="Display"
        />

        <BTab
          :id="`${nodeId}-show-hide-settings`"
          title-link-class="nav-link-collapse"
          title-item-class="ms-auto"
          @click="toggleExpand()"
        >
          <template #title>
            &nbsp;
          </template>
        </BTab>
      </BTabs>

      <div class="auto-animate" v-auto-animate>
        <div class="tabs-settings-body-content" v-if="config.activeTabIndex === 0">
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
        </div>

        <div class="tabs-settings-body-content" v-if="config.activeTabIndex === 1">
          <CheckboxColorList :items="islandCheckboxColors(config)" />
        </div>

      </div>

    </template>
  </StepCard>
</template>