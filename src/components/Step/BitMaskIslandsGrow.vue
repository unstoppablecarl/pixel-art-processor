<script setup lang="ts">
import { BTab, BTabs } from 'bootstrap-vue-next'
import { ref, shallowReactive } from 'vue'
import { BlobGrower } from '../../lib/generators/BlobGrower.ts'
import { smoothIslandGaussian } from '../../lib/generators/smoothIsland.ts'
import { useStepHandler } from '../../lib/pipeline/useStepHandler.ts'
import { BitMask } from '../../lib/step-data-types/BitMask.ts'
import { type Island, IslandType } from '../../lib/step-data-types/BitMask/Island.ts'
import { parseColorData } from '../../lib/util/color.ts'
import { prng } from '../../lib/util/prng.ts'
import { Sketch } from '../../lib/util/Sketch.ts'
import StepCard from '../StepCard.vue'
import CheckboxColor from '../UI/CheckboxColor.vue'
import EnumSelect from '../UI/EnumSelect.vue'

const { stepId } = defineProps<{ stepId: string }>()

const DEFAULT_COLORS = {
  showExpandableBoundsColor: 'rgba(0, 0, 255, 0.5)',
  showExpandableColor: 'rgba(255, 0, 0, 0.5)',
  showExpandableRespectingDistanceColor: 'rgba(0, 255, 0, 0.5)',
  islandColor: 'rgba(255, 255, 255, 1)',
}

enum GrowType {
  CLUSTER = 'Cluster',
  WEIGHTED = 'Weighted',
  DIRECTIONAL = 'Directional',
  MARCHING = 'Marching',
  PERLIN = 'Perlin'
}

const ISLAND_TYPES = {
  ALL: {
    label: 'All',
    filter: (i: Island) => true,
  },
  INNER: {
    label: 'Inner',
    filter: (i: Island) => i.type === IslandType.NORMAL,
  },
  EDGE: {
    label: 'Edge',
    filter: (i: Island) => i.type !== IslandType.NORMAL,
  },
}

const GrowIslandSelectOptions = ref(Object.fromEntries(
  Object.entries(ISLAND_TYPES).map(([key, val]) => [key, val.label]),
))

const step = useStepHandler(stepId, {
  inputDataTypes: [BitMask],
  outputDataType: BitMask,
  config() {
    return shallowReactive({
      minDistance: 4,
      maxDistance: 100,
      islandType: 'ALL' as keyof typeof ISLAND_TYPES,
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

      activeTabIndex: 0,
      ...DEFAULT_COLORS,
    })
  },
  run({ config, inputData }) {
    if (!inputData) return

    const mask = inputData as BitMask
    const C = config

    const islands = mask.getIslands()
    const islandFilter = ISLAND_TYPES[C.islandType].filter
    const withinBounds = mask.borderToBounds(C.minDistance)
    const grower = new BlobGrower(mask, islands, prng, C.minDistance, islandFilter, withinBounds)

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
        return !mask.isWithinBorder(x, y, 2)
      })
    })

    const sketch = new Sketch(mask.width, mask.height)
    const islandColor = parseColorData(config.islandColor)
    sketch.putImageData(mask.toImageData(islandColor))

    filteredIslands.forEach((i) => {

      if (C.showExpandableBounds) {
        sketch.fillRectBounds(i.expandableBounds, C.showExpandableBoundsColor)
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

          <CheckboxColor
            label="Islands"
            :check="false"
            v-model:color="config.islandColor"
          />

          <CheckboxColor
            label="Expandable"
            v-model:active="config.showExpandable"
            v-model:color="config.showExpandableColor"
          />

          <CheckboxColor
            label="Expandable Bounds"
            v-model:active="config.showExpandableRespectingDistance"
            v-model:color="config.showExpandableRespectingDistanceColor"
          />

          <CheckboxColor
            label="Expandable Bounds"
            v-model:active="config.showExpandableBounds"
            v-model:color="config.showExpandableBoundsColor"
          />


          <button role="button" class="btn btn-sm btn-secondary mt-2" @click="Object.assign(config, DEFAULT_COLORS)">
            Reset Colors
          </button>

        </BTab>
      </BTabs>
    </template>
  </StepCard>
</template>