<script lang="ts">
import { BitMask } from '../../lib/node-data-types/BitMask.ts'
import { type NodeDef, NodeType } from '../../lib/pipeline/_types.ts'
import { defineStep } from '../../lib/pipeline/types/definitions.ts'

export const STEP_META = defineStep({
  type: NodeType.STEP,
  def: 'bitmask_islands_erode' as NodeDef,
  displayName: 'BitMask Islands: Erode',
  inputDataTypes: [BitMask],
  outputDataType: BitMask,
})
</script>
<script setup lang="ts">
import { reactive } from 'vue'
import {
  DEFAULT_SHOW_ISLANDS, DEFAULT_SHOW_REMOVED,
  ISLAND_FILTERS,
  ISLAND_TYPES_FILTER_OPTIONS,
  IslandFilterType, islandsDrawCheckboxColors, sketchIslandVisuals,
} from '../../lib/vue/island-ui.ts'
import {
  mutateIslands,
  type IslandMutator,
} from '../../lib/generators/IslandMutator.ts'
import { islandEroderWeighted } from '../../lib/generators/IslandSmoother/island-eroder-weighted.ts'
import type { NodeId } from '../../lib/pipeline/_types.ts'
import { defineStepHandler, useStepHandler } from '../../lib/pipeline/NodeHandler/StepHandler.ts'
import { getIslands } from '../../lib/node-data-types/BitMask/island-helpers.ts'
import { Island, type IslandPointFilter, IslandType } from '../../lib/node-data-types/BitMask/Island.ts'
import NodeCard from '../Card/NodeCard.vue'
import CardFooterSettingsTabs from '../UI/CardFooterSettingsTabs.vue'
import CheckboxColorList from '../UIForms/CheckboxColorList.vue'
import RecordSelect from '../UIForms/RecordSelect.vue'
import RangeSlider from '../UIForms/RangeSlider.vue'
import { rangeSliderConfig } from '../UIForms/RangeSlider.ts'

const { nodeId } = defineProps<{ nodeId: NodeId }>()

enum ErodeType {
  WEIGHTED = 'WEIGHTED',
}

const ERODE_TYPE_OPTIONS: Record<ErodeType, string> = {
  [ErodeType.WEIGHTED]: 'Weighted',
}

const ITERATION_DEFAULTS = rangeSliderConfig({
  min: 1,
  max: 50,
  value: 1,
})

const handler = defineStepHandler(STEP_META, {
  config() {
    return {
      islandType: IslandFilterType.ALL as IslandFilterType,
      erodeType: ErodeType.WEIGHTED as ErodeType,
      borderBuffer: 2,

      iterations: {
        ...ITERATION_DEFAULTS,
      },

      weightedFactor: 0.5,

      activeTabIndex: 0,

      ...DEFAULT_SHOW_ISLANDS.CONFIG,
      ...DEFAULT_SHOW_REMOVED.CONFIG,
    }
  },
  reactiveConfig: reactive,
  async run({ config, inputData }) {
    if (!inputData) return

    const mask = inputData
    const islands = getIslands(mask)
    const C = config

    const map: Record<ErodeType, () => IslandMutator> = {
      [ErodeType.WEIGHTED]: () => islandEroderWeighted(C.weightedFactor),
    }
    const grower = map[config.erodeType]()

    const islandFilter = ISLAND_FILTERS[C.islandType].filter

    const pointFilter: IslandPointFilter = (x, y, i) => {
      if (i.type === IslandType.NORMAL) return true
      return !mask.isWithinBorder(x, y, C.borderBuffer)
    }

    const { added, removed } = mutateIslands({
      mask,
      islands,
      islandFilter,
      getPoints: (i: Island) => {
        return i.getEdge().filter(({ x, y }) => pointFilter(x, y, i))
      },
      iterations: C.iterations.value,
      iterator: grower,
    })

    const filteredIslands = islands.filter(islandFilter)
    const sketch = sketchIslandVisuals(mask, config, filteredIslands, islands, added, removed)

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
        :active-tab-index="config.activeTabIndex"
      >
        <template #settings>
          <RangeSlider
            :id="`${nodeId}-border-buffer`"
            label="Border Buffer"
            v-model:value="config.borderBuffer"
            :min="0"
            :max="node.outputData?.width ?? 400"
            :step="1"
          />

          <RangeSlider
            :id="`${nodeId}-grow-iterations`"
            label="Iterations"
            :defaults="ITERATION_DEFAULTS"
            v-model:value="config.iterations.value"
            v-model:min="config.iterations.min"
            v-model:max="config.iterations.max"
            v-model:step="config.iterations.step"
          />

          <div class="row pb-2 gx-1">
            <div class="col">
              <label class="form-label">Island Type</label>
              <RecordSelect :options="ISLAND_TYPES_FILTER_OPTIONS" v-model="config.islandType" />
            </div>
            <div class="col">
              <label class="form-label">Grow Type</label>
              <RecordSelect :options="ERODE_TYPE_OPTIONS" v-model="config.erodeType" />
            </div>
          </div>

          <template v-if="config.erodeType === ErodeType.WEIGHTED">
            <div>
              <label class="form-label">Factor: {{ config.weightedFactor }}</label>
              <input type="range" min="0" max="1" step=".02" v-model.number="config.weightedFactor"
                     class="form-range" />
            </div>
          </template>

        </template>
        <template #display-options>
          <CheckboxColorList :items="islandsDrawCheckboxColors(config)" />

        </template>
      </CardFooterSettingsTabs>

    </template>
  </NodeCard>
</template>