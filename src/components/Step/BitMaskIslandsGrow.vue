<script lang="ts">
import { StepType } from '../../lib/pipeline/Step.ts'
import type { StepMeta } from '../../lib/pipeline/StepMeta.ts'

export const STEP_META: StepMeta = {
  type: StepType.NORMAL,
  def: 'bitmask_islands_grow',
  displayName: 'BitMask Islands: Grow',
  inputDataTypes: [BitMask],
  outputDataType: BitMask,
}

</script>
<script setup lang="ts">
import { BTab, BTabs } from 'bootstrap-vue-next'
import { reactive } from 'vue'
import {
  DEFAULT_EXPANDABLE,
  DEFAULT_EXPANDABLE_BOUNDS,
  DEFAULT_EXPANDABLE_RESPECTING_DISTANCE,
  DEFAULT_SHOW_ADDED,
  DEFAULT_SHOW_ISLANDS,
  ISLAND_FILTERS,
  ISLAND_TYPES_FILTER_OPTIONS,
  islandCheckboxColors,
  IslandFilterType,
  sketchIslandVisuals,
} from '../../lib/generators/island-ui.ts'
import { mutateIslands, type IslandMutator } from '../../lib/generators/IslandMutator.ts'
import { clusterGrower } from '../../lib/generators/IslandGrower/ClusterGrower.ts'
import { directionalGrower } from '../../lib/generators/IslandGrower/DirectionalGrowth.ts'
import { marchingGrower } from '../../lib/generators/IslandGrower/MarchingGrower.ts'
import { perlinGrower } from '../../lib/generators/IslandGrower/PerlinGrower.ts'
import { weightedRandomGrower } from '../../lib/generators/IslandGrower/WeightedRandomGrower.ts'
import { useStepHandler } from '../../lib/pipeline/useStepHandler.ts'
import { BitMask } from '../../lib/step-data-types/BitMask.ts'
import { Island, type IslandPointFilter, IslandType } from '../../lib/step-data-types/BitMask/Island.ts'
import StepCard from '../StepCard.vue'
import CheckboxColorList from '../UIForms/CheckboxColorList.vue'
import RecordSelect from '../UIForms/RecordSelect.vue'
import RangeSlider from '../UIForms/RangeSlider.vue'
import { rangeSliderConfig } from '../UIForms/RangeSlider.ts'

const { stepId } = defineProps<{ stepId: string }>()

enum GrowType {
  PERLIN = 'PERLIN',
  CLUSTER = 'CLUSTER',
  WEIGHTED = 'WEIGHTED',
  DIRECTIONAL = 'DIRECTIONAL',
  MARCHING = 'MARCHING',
}

const GROW_TYPE_OPTIONS: Record<GrowType, string> = {
  [GrowType.PERLIN]: 'Perlin',
  [GrowType.CLUSTER]: 'Cluster',
  [GrowType.WEIGHTED]: 'Weighted',
  [GrowType.DIRECTIONAL]: 'Directional',
  [GrowType.MARCHING]: 'Marching',
}

const ITERATION_DEFAULTS = rangeSliderConfig({
  min: 0,
  max: 50,
  value: 1,
})

const step = useStepHandler(stepId, {
  ...STEP_META,
  inputDataTypes: [BitMask],
  outputDataType: BitMask,
  config() {
    return reactive({
      minDistance: 4,
      islandType: IslandFilterType.ALL as IslandFilterType,
      growType: GrowType.PERLIN as GrowType,

      iterations: {
        ...ITERATION_DEFAULTS,
      },

      clusterRadius: 0,
      marchingGrowthPixelsPerIteration: 1,
      perlinFactor: 0.2,

      activeTabIndex: 0,
      ...DEFAULT_SHOW_ISLANDS.CONFIG,
      ...DEFAULT_EXPANDABLE.CONFIG,
      ...DEFAULT_SHOW_ADDED.CONFIG,
      ...DEFAULT_EXPANDABLE_BOUNDS.CONFIG,
      ...DEFAULT_EXPANDABLE_RESPECTING_DISTANCE.CONFIG,
    })
  },
  run({ config, inputData }) {
    if (!inputData) return

    const mask = inputData as BitMask
    const islands = mask.getIslands()
    const C = config

    const map: Record<GrowType, () => IslandMutator> = {
      [GrowType.CLUSTER]: () => clusterGrower(C.clusterRadius),
      [GrowType.DIRECTIONAL]: () => directionalGrower(),
      [GrowType.MARCHING]: () => marchingGrower(C.marchingGrowthPixelsPerIteration),
      [GrowType.WEIGHTED]: () => weightedRandomGrower(),
      [GrowType.PERLIN]: () => perlinGrower(C.perlinFactor),
    }
    const grower = map[config.growType]()

    const islandFilter = ISLAND_FILTERS[C.islandType].filter
    const borderBounds = mask.borderToBounds(C.minDistance)

    const pointFilter: IslandPointFilter = (x, y, island) => {
      if (island.type === IslandType.NORMAL) {
        if (!borderBounds.contains(x, y)) return false
      }

      return true
    }

    const { added, removed } = mutateIslands({
      mask,
      islands,
      islandFilter,
      getPoints: (i: Island) => {
        return i.getExpandableRespectingMinDistance(islands, C.minDistance, pointFilter)
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

const config = step.config

</script>
<template>
  <StepCard :step="step">
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
            :id="`${stepId}-grow-min-distance`"
            label="Min Distance"
            v-model:value="config.minDistance"
            :min="0"
            :max="step.inputData?.width"
            :step="1"
          />

          <RangeSlider
            :id="`${stepId}-grow-iterations`"
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
              <RecordSelect :options="GROW_TYPE_OPTIONS" v-model="config.growType" />
            </div>
          </div>

          <template v-if="config.growType === GrowType.PERLIN">
            <div>
              <label class="form-label">Factor: {{ config.perlinFactor }}</label>
              <input type="range" min="0" max="1" step="0.01" v-model.number="config.perlinFactor"
                     class="form-range" />
            </div>
          </template>

          <template v-if="config.growType === GrowType.CLUSTER">
            <div>
              <label class="form-label">Radius: {{ config.clusterRadius }}</label>
              <input type="range" min="1" max="20" step="1" v-model.number="config.clusterRadius"
                     class="form-range" />
            </div>
          </template>

          <template v-if="config.growType === GrowType.MARCHING">
            <div>
              <label class="form-label">Pixels Per Iteration: {{ config.marchingGrowthPixelsPerIteration }}</label>
              <input type="range" min="1" max="20" step="1" v-model.number="config.marchingGrowthPixelsPerIteration"
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