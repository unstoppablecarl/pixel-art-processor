<script setup lang="ts">
import { shallowReactive } from 'vue'
import { BlobGrower } from '../../lib/generators/BlobGrower.ts'
import { useStepHandler } from '../../lib/pipeline/useStepHandler.ts'
import { BitMask, IslandType } from '../../lib/step-data-types/BitMask.ts'
import { prng } from '../../lib/util/prng.ts'
import StepCard from '../StepCard.vue'

const { stepId } = defineProps<{ stepId: string }>()

enum GrowType {
  CLUSTER = 'CLUSTER',
  WEIGHTED = 'WEIGHTED',
  DIRECTIONAL = 'DIRECTIONAL',
  MARCHING = 'MARCHING',
  PERLIN = 'PERLIN'
}

const step = useStepHandler(stepId, {
  inputDataTypes: [BitMask],
  outputDataType: BitMask,
  config() {
    return shallowReactive({
      minDistance: 4,

      growType: GrowType.CLUSTER as GrowType,

      clusterGrowthIterations: 0,
      clusterRadius: 0,

      weightedRandomIterations: 0,

      perlinIterations: 0,

      directionalGrowthIterations: 0,

      marchingGrowthIterations: 0,
      marchingGrowthPixelsPerIteration: 1,
    })
  },
  run({ config, inputData }) {
    if (!inputData) return

    const mask = inputData as BitMask
    const C = config

    const islands = mask.getIslands()
    const innerIslands = islands.filter(i => i.type === IslandType.NORMAL)

    const grower = new BlobGrower(mask, innerIslands, prng, C.minDistance)

    const map = {
      [GrowType.CLUSTER]: () => grower.clusterGrowth(C.clusterGrowthIterations, C.clusterRadius),
      [GrowType.DIRECTIONAL]: () => grower.directionalGrowth(C.directionalGrowthIterations),
      [GrowType.MARCHING]: () => grower.marchingGrowth(C.marchingGrowthIterations, C.marchingGrowthPixelsPerIteration),
      [GrowType.WEIGHTED]: () => grower.weightedRandomGrowth(C.weightedRandomIterations),
      [GrowType.PERLIN]: () => grower.perlinLikeGrowth(C.perlinIterations),
    }

    map[config.growType]()

    return {
      output: mask,
      preview: mask.toImageData(),
    }
  },
})

const config = step.config

</script>
<template>
  <StepCard
    :step="step"
  >
    <template #header>
      Grow BitMsk Islands
    </template>
    <template #footer>
      <div>
        <label class="form-label">Min Dist: {{ config.minDistance }}</label>
        <input type="range" min="1" max="20" step="1" v-model.number="config.minDistance"
               class="form-range" />
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

    </template>
  </StepCard>
</template>