<script lang="ts">
import { NodeType } from '../../lib/pipeline/Node.ts'
import type { AnyStepMeta } from '../../lib/pipeline/StepMeta.ts'
import { BitMask } from '../../lib/step-data-types/BitMask.ts'

export const STEP_META: AnyStepMeta = {
  type: NodeType.STEP,
  def: 'bitmask_islands_erode',
  displayName: 'BitMask Islands: Erode',
  inputDataTypes: [BitMask],
  outputDataType: BitMask,
}

</script>
<script setup lang="ts">
import { BTab, BTabs } from 'bootstrap-vue-next'
import {
  DEFAULT_SHOW_ISLANDS, DEFAULT_SHOW_REMOVED,
  ISLAND_FILTERS,
  ISLAND_TYPES_FILTER_OPTIONS, islandCheckboxColors,
  IslandFilterType, sketchIslandVisuals,
} from '../../lib/generators/island-ui.ts'
import {
  mutateIslands,
  type IslandMutator,
} from '../../lib/generators/IslandMutator.ts'
import { islandEroderWeighted } from '../../lib/generators/IslandSmoother/island-eroder-weighted.ts'
import type { NodeId } from '../../lib/pipeline/Node.ts'
import { useStepHandler } from '../../lib/pipeline/useStepHandler.ts'
import { Island, type IslandPointFilter, IslandType } from '../../lib/step-data-types/BitMask/Island.ts'
import StepCard from '../StepCard.vue'
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

const node = useStepHandler(nodeId, {
  ...STEP_META,
  inputDataTypes: [BitMask],
  outputDataType: BitMask,
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
  async run({ config, inputData }) {
    if (!inputData) return

    const mask = inputData as BitMask
    const islands = mask.getIslands()
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