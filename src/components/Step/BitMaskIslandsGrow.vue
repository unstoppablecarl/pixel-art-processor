<script lang="ts">
import type { StepMeta } from '../../lib/pipeline/StepMeta.ts'

export const STEP_META: StepMeta = {
  def: 'bitmask_grow_islands',
  displayName: 'BitMask Islands Grow',
  inputDataTypes: [BitMask],
  outputDataType: BitMask,
}

</script>
<script setup lang="ts">
import { BTab, BTabs } from 'bootstrap-vue-next'
import { ref, shallowReactive, toRef } from 'vue'
import { BlobGrower } from '../../lib/generators/BlobGrower.ts'
import { smoothIslandGaussian } from '../../lib/generators/smoothIsland.ts'
import { useStepHandler } from '../../lib/pipeline/useStepHandler.ts'
import { BitMask } from '../../lib/step-data-types/BitMask.ts'
import { type Island, type IslandPointFilter, IslandType } from '../../lib/step-data-types/BitMask/Island.ts'
import { parseColorData } from '../../lib/util/color.ts'
import { prng } from '../../lib/util/prng.ts'
import { Sketch } from '../../lib/util/Sketch.ts'
import StepCard from '../StepCard.vue'
import CheckboxColorList, { type CheckboxColorListItem } from '../UI/CheckboxColorList.vue'
import EnumSelect from '../UI/EnumSelect.vue'

const { stepId } = defineProps<{ stepId: string }>()

const DEFAULT_COLORS = {
  showExpandableBoundsColor: 'rgba(0, 0, 255, 0.5)',
  showExpandableColor: 'rgba(255, 0, 0, 0.5)',
  showExpandableRespectingDistanceColor: 'rgba(0, 255, 0, 0.5)',
  showIslandColor: 'rgba(255, 255, 255, 1)',
}

enum GrowType {
  CLUSTER = 'Cluster',
  WEIGHTED = 'Weighted',
  DIRECTIONAL = 'Directional',
  MARCHING = 'Marching',
  PERLIN = 'Perlin'
}

enum IslandFilterType {
  ALL,
  INNER,
  EDGE,
}

const ISLAND_TYPES = {
  [IslandFilterType.ALL]: {
    label: 'All',
    filter: (i: Island) => true,
  },
  [IslandFilterType.INNER]: {
    label: 'Inner',
    filter: (i: Island) => i.type === IslandType.NORMAL,
  },
  [IslandFilterType.EDGE]: {
    label: 'Edge',
    filter: (i: Island) => i.type !== IslandType.NORMAL,
  },
}

const GrowIslandSelectOptions = ref(Object.fromEntries(
  Object.entries(ISLAND_TYPES).map(([key, val]) => [key, val.label]),
))

const step = useStepHandler(stepId, {
  ...STEP_META,
  inputDataTypes: [BitMask],
  outputDataType: BitMask,
  config() {
    return shallowReactive({
      minDistance: 4,
      maxDistance: 100,
      islandType: IslandFilterType.ALL as IslandFilterType,
      growType: GrowType.CLUSTER as GrowType,

      clusterGrowthIterations: 0,
      clusterRadius: 0,

      weightedRandomIterations: 0,

      perlinIterations: 0,

      directionalGrowthIterations: 0,

      marchingGrowthIterations: 0,
      marchingGrowthPixelsPerIteration: 1,

      smooth: 1,

      showExpandableBounds: false,
      showExpandable: false,
      showExpandableRespectingDistance: false,
      showIsland: true,

      activeTabIndex: 0,
      ...DEFAULT_COLORS,
    })
  },
  run({ config, inputData }) {
    if (!inputData) return

    const mask = inputData as BitMask
    const islands = mask.getIslands()
    const C = config

    const islandFilter = ISLAND_TYPES[C.islandType].filter
    const borderBounds = mask.borderToBounds(C.minDistance)

    const pointFilter: IslandPointFilter = (x, y, island) => {
      if (island.type === IslandType.NORMAL) {
        if (!borderBounds.contains(x, y)) return false
      }

      return true
    }

    const grower = new BlobGrower(mask, islands, prng, C.minDistance, islandFilter, pointFilter)

    const map = {
      [GrowType.CLUSTER]: () => grower.clusterGrowth(C.clusterGrowthIterations, C.clusterRadius),
      [GrowType.DIRECTIONAL]: () => grower.directionalGrowth(C.directionalGrowthIterations),
      [GrowType.MARCHING]: () => grower.marchingGrowth(C.marchingGrowthIterations, C.marchingGrowthPixelsPerIteration),
      [GrowType.WEIGHTED]: () => grower.weightedRandomGrowth(C.weightedRandomIterations),
      [GrowType.PERLIN]: () => grower.perlinLikeGrowth(C.perlinIterations),
    }

    map[config.growType]()

    const filteredIslands = islands.filter(islandFilter)
    filteredIslands.forEach(i => {
      smoothIslandGaussian(i, C.smooth, (x, y) => {
        if (i.type === IslandType.NORMAL) return true
        return !mask.isWithinBorder(x, y, 2)
      })
    })

    const sketch = new Sketch(mask.width, mask.height)
    const islandColor = parseColorData(config.showIslandColor)

    if (C.showIsland) {
      sketch.putImageData(mask.toImageData(islandColor))
    }

    filteredIslands.forEach((i) => {
      if (C.showExpandableBounds) {
        sketch.fillRectBounds(i.expandableBounds.growNew(1), C.showExpandableBoundsColor)
      }

      if (C.showExpandable) {
        i.getExpandable().forEach(({ x, y }) => {
          sketch.setPixel(x, y, C.showExpandableColor)
        })
      }

      if (C.showExpandableRespectingDistance) {
        i.getExpandableRespectingMinDistance(islands, C.minDistance).forEach(({ x, y }) => {
          sketch.setPixel(x, y, C.showExpandableRespectingDistanceColor)
        })
      }
    })
    return {
      output: mask,
      preview: sketch.toImageData(),
    }

  },
})

const config = step.config

const checkboxColors: CheckboxColorListItem[] = [
  {
    label: 'Islands',
    active: toRef(config, 'showIsland'),
    color: toRef(config, 'showIslandColor'),
    defaultColor: DEFAULT_COLORS.showIslandColor,
  },
  {
    label: 'Expandable',
    active: toRef(config, 'showExpandable'),
    color: toRef(config, 'showExpandableColor'),
    defaultColor: DEFAULT_COLORS.showExpandableColor,
  },
  {
    label: 'Expandable Dist.',
    active: toRef(config, 'showExpandableRespectingDistance'),
    color: toRef(config, 'showExpandableRespectingDistanceColor'),
    defaultColor: DEFAULT_COLORS.showExpandableRespectingDistanceColor,
  },
  {
    label: 'Expandable Bounds',
    active: toRef(config, 'showExpandableBounds'),
    color: toRef(config, 'showExpandableBoundsColor'),
    defaultColor: DEFAULT_COLORS.showExpandableBoundsColor,
  },
]


</script>
<template>
  <StepCard :step="step" :footer-tabs="true">
    <template #header>
      Grow BitMsk Islands
    </template>
    <template #footer>
      <BTabs
        content-class="mt-3 p-2"
        v-model:index="config.activeTabIndex"
      >
        <BTab
          title="Settings"
          id="settings"
        >
          <div>
            <label class="form-label">Min Dist: {{ config.minDistance }}</label>
            <input type="range" min="1" max="20" step="1" v-model.number="config.minDistance"
                   class="form-range" />
          </div>
          <div class="pb-2">
            <label class="form-label">Island Type</label>
            <EnumSelect :options="GrowIslandSelectOptions" v-model="config.islandType" />
          </div>
          <div class="pb-2">
            <label class="form-label">Grow Type</label>
            <select class="form-select me-2" aria-label="" v-model="config.growType">
              <option v-for="growType in GrowType" :value="growType" :key="growType">{{ growType }}</option>
            </select>
          </div>
          <template v-if="config.growType === GrowType.CLUSTER">
            <div>
              <label class="form-label">Iterations: {{ config.clusterGrowthIterations }}</label>
              <input type="range" min="1" max="20" step="1" v-model.number="config.clusterGrowthIterations"
                     class="form-range" />
            </div>
            <div>
              <label class="form-label">Radius: {{ config.clusterRadius }}</label>
              <input type="range" min="1" max="20" step="1" v-model.number="config.clusterRadius"
                     class="form-range" />
            </div>
          </template>

          <template v-if="config.growType === GrowType.DIRECTIONAL">
            <div>
              <label class="form-label">Iterations: {{ config.clusterGrowthIterations }}</label>
              <input type="range" min="1" max="20" step="1" v-model.number="config.directionalGrowthIterations"
                     class="form-range" />
            </div>
          </template>

          <template v-if="config.growType === GrowType.WEIGHTED">
            <div>
              <label class="form-label">Iterations: {{ config.weightedRandomIterations }}</label>
              <input type="range" min="1" max="20" step="1" v-model.number="config.weightedRandomIterations"
                     class="form-range" />
            </div>
          </template>

          <template v-if="config.growType === GrowType.PERLIN">
            <div>
              <label class="form-label">Iterations: {{ config.perlinIterations }}</label>
              <input type="range" min="1" max="20" step="1" v-model.number="config.perlinIterations"
                     class="form-range" />
            </div>
          </template>

          <template v-if="config.growType === GrowType.MARCHING">
            <div>
              <label class="form-label">Iterations: {{ config.marchingGrowthIterations }}</label>
              <input type="range" min="1" max="20" step="1" v-model.number="config.marchingGrowthIterations"
                     class="form-range" />
            </div>

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
          <CheckboxColorList :items="checkboxColors" />
        </BTab>
      </BTabs>
    </template>
  </StepCard>
</template>