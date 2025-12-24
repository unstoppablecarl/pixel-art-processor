<script lang="ts">
import type { StepMeta } from '../../lib/pipeline/StepMeta.ts'

export const STEP_META: StepMeta = {
  def: 'bitmask_islands_smooth',
  displayName: 'BitMask Islands Smooth',
  inputDataTypes: [BitMask],
  outputDataType: BitMask,
}

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
} from '../../lib/generators/island-ui.ts'
import { smoothAutomata } from '../../lib/generators/IslandSmoother/island-smoother-automata.ts'
import { smoothIslandsGaussian } from '../../lib/generators/IslandSmoother/island-smoother-gaussian.ts'
import { useStepHandler } from '../../lib/pipeline/useStepHandler.ts'
import { BitMask } from '../../lib/step-data-types/BitMask.ts'
import { type IslandPointFilter, IslandType } from '../../lib/step-data-types/BitMask/Island.ts'
import StepCard from '../StepCard.vue'
import CheckboxColorList from '../UI/CheckboxColorList.vue'
import RecordSelect from '../UI/RecordSelect.vue'
import RangeSlider from '../UI/RangeSlider.vue'
import { rangeSliderConfig } from '../UI/RangeSlider.ts'

const { stepId } = defineProps<{ stepId: string }>()

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

const step = useStepHandler(stepId, {
  ...STEP_META,
  inputDataTypes: [BitMask],
  outputDataType: BitMask,
  config() {
    return reactive({
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
    })
  },
  run({ config, inputData }) {
    if (!inputData) return

    const mask = inputData as BitMask
    const islands = mask.getIslands()
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
          <RangeSlider
            :id="`${stepId}-iterations`"
            label="Iterations"
            :defaults="ITERATION_DEFAULTS"
            v-model:value="config.iterations.value"
            v-model:min="config.iterations.min"
            v-model:max="config.iterations.max"
            v-model:step="config.iterations.step"
          />

          <RangeSlider
            :id="`${stepId}-border-buffer`"
            label="Border Buffer"
            v-model:value="config.borderBuffer"
            :min="0"
            :max="step.inputData?.width"
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
  </StepCard>
</template>