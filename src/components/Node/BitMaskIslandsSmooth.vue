<script lang="ts">
import { BitMask } from '../../lib/node-data-types/BitMask.ts'
import { type NodeDef, NodeType } from '../../lib/pipeline/_types.ts'
import { defineStep } from '../../lib/pipeline/types/definitions.ts'

export const STEP_META = defineStep({
  type: NodeType.STEP,
  def: 'bitmask_islands_smooth' as NodeDef,
  displayName: 'BitMask Islands: Smooth',
  inputDataTypes: [BitMask],
  outputDataType: BitMask,
})
</script>
<script setup lang="ts">
import { BTab, BTabs } from 'bootstrap-vue-next'
import { reactive } from 'vue'
import {
  DEFAULT_SHOW_ADDED,
  DEFAULT_SHOW_ISLANDS,
  DEFAULT_SHOW_REMOVED,
  ISLAND_FILTERS,
  ISLAND_TYPES_FILTER_OPTIONS,
  islandCheckboxColors,
  IslandFilterType,
  sketchIslandVisuals,
} from '../../lib/vue/island-ui.ts'
import { smoothAutomata } from '../../lib/generators/IslandSmoother/island-smoother-automata.ts'
import { smoothIslandsGaussian } from '../../lib/generators/IslandSmoother/island-smoother-gaussian.ts'
import type { NodeId } from '../../lib/pipeline/_types.ts'
import { defineStepHandler, useStepHandler } from '../../lib/pipeline/NodeHandler/StepHandler.ts'
import { getIslands } from '../../lib/node-data-types/BitMask/island-helpers.ts'
import { type IslandPointFilter, IslandType } from '../../lib/node-data-types/BitMask/Island.ts'
import NodeCard from '../Card/NodeCard.vue'
import CheckboxColorList from '../UIForms/CheckboxColorList.vue'
import RecordSelect from '../UIForms/RecordSelect.vue'
import RangeSlider from '../UIForms/RangeSlider.vue'
import { rangeSliderConfig } from '../UIForms/RangeSlider.ts'

const { nodeId } = defineProps<{ nodeId: NodeId }>()

enum SmoothType {
  GAUSSIAN = 'GAUSSIAN',
  AUTOMATA = 'AUTOMATA'
}

const SMOOTH_TYPE_OPTIONS: Record<SmoothType, string> = {
  [SmoothType.GAUSSIAN]: 'Gaussian',
  [SmoothType.AUTOMATA]: 'Automata',
}

const ITERATION_DEFAULTS = rangeSliderConfig({
  min: 1,
  max: 50,
  value: 1,
})

const handler = defineStepHandler(STEP_META, {
  config() {
    return {
      minDistance: 4,
      islandType: IslandFilterType.ALL as IslandFilterType,
      smoothType: SmoothType.GAUSSIAN as SmoothType,

      borderBuffer: 2,

      iterations: {
        ...ITERATION_DEFAULTS,
      },

      activeTabIndex: 0,
      ...DEFAULT_SHOW_ISLANDS.CONFIG,
      ...DEFAULT_SHOW_ADDED.CONFIG,
      ...DEFAULT_SHOW_REMOVED.CONFIG,
    }
  },
  reactiveConfig: reactive,
  async run({ config, inputData }) {
    if (!inputData) return

    const mask = inputData.copy()
    const islands = getIslands(mask)
    const C = config

    const islandFilter = ISLAND_FILTERS[C.islandType].filter
    const filteredIslands = islands.filter(islandFilter)

    const pointFilter: IslandPointFilter = (x, y, i) => {
      if (i.type === IslandType.NORMAL) return true
      return !mask.isWithinBorder(x, y, C.borderBuffer)
    }

    const map: Record<SmoothType, () => void> = {
      [SmoothType.GAUSSIAN]: () => smoothIslandsGaussian(filteredIslands, C.iterations.value, pointFilter),
      [SmoothType.AUTOMATA]: () => smoothAutomata(mask, C.iterations.value, (x, y, v) => !mask.isWithinBorder(x, y, C.borderBuffer)),
    }
    map[config.smoothType]()

    const sketch = sketchIslandVisuals(mask, config, filteredIslands, islands)
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
      <BTabs
        content-class="mt-3 p-2"
        v-model:index="config.activeTabIndex"
      >
        <BTab
          title="Settings"
          id="settings"
        >
          <RangeSlider
            :id="`${nodeId}-iterations`"
            label="Iterations"
            :defaults="ITERATION_DEFAULTS"
            v-model:value="config.iterations.value"
            v-model:min="config.iterations.min"
            v-model:max="config.iterations.max"
            v-model:step="config.iterations.step"
          />

          <RangeSlider
            :id="`${nodeId}-border-buffer`"
            label="Border Buffer"
            v-model:value="config.borderBuffer"
            :min="0"
            :max="node.outputData?.width ?? 400"
            :step="1"
          />

          <div class="row pb-2 gx-1">
            <div class="col">
              <label class="form-label">Island Type</label>
              <RecordSelect :options="ISLAND_TYPES_FILTER_OPTIONS" v-model="config.islandType" />
            </div>
            <div class="col">
              <label class="form-label">Smooth Type</label>
              <RecordSelect :options="SMOOTH_TYPE_OPTIONS" v-model="config.smoothType" />
            </div>
          </div>

        </BTab>
        <BTab
          title="Display"
          id="display"
        >
          <CheckboxColorList :items="islandCheckboxColors(config)" />
        </BTab>
      </BTabs>
    </template>
  </NodeCard>
</template>