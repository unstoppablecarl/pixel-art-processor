<script setup lang="ts">
import { shallowReactive } from 'vue'
import { BlobGrower } from '../../lib/generators/BlobGrower.ts'
import { smoothIslandGaussian } from '../../lib/generators/smoothIsland.ts'
import { useStepHandler } from '../../lib/pipeline/useStepHandler.ts'
import { BitMask, IslandType } from '../../lib/step-data-types/BitMask.ts'
import { prng } from '../../lib/util/prng.ts'
import StepCard from '../StepCard.vue'

const { stepId } = defineProps<{ stepId: string }>()

const step = useStepHandler(stepId, {
  inputDataTypes: [BitMask],
  outputDataType: BitMask,
  config() {
    return shallowReactive({
      minDistance: 4,

      edgePerlin: 1,
      edgeSmooth: 1,

      clusterGrowthIterations: 0,
      clusterRadius: 0,
      weightedRandomIterations: 0,
      perlinIterations: 0,
      directionalGrowthIterations: 0,

      marchingGrowthIterations: 0,
      marchingGrowthPixelsPerIteration: 1,
      smooth: 2,
    })
  },
  run({ config, inputData }) {
    if (!inputData) return

    const mask = inputData as BitMask
    const islands = mask.getIslands()
    const C = config

    // const innerIslands = islands.filter(i => i.type === IslandType.NORMAL)
    const edgeIslands = islands.filter(i => i.type !== IslandType.NORMAL)

    const edgeGrower = new BlobGrower(mask, edgeIslands, prng, config.minDistance)
    edgeGrower.perlinLikeGrowth(C.edgePerlin)

    edgeIslands.forEach(i => {
      smoothIslandGaussian(i, C.edgeSmooth, (x, y) => {
        return !mask.isWithinBorder(x, y, 2)
      })
    })

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
      Grow BitMsk Island Edges
    </template>
    <template #footer>
      <div>
        <label class="form-label">Min Dist: {{ config.minDistance }}</label>
        <input type="range" min="1" max="20" step="1" v-model.number="config.minDistance"
               class="form-range" />
      </div>
      <div>
        <label class="form-label">Edge Perlin: {{ config.edgePerlin }}</label>
        <input type="range" min="1" max="20" step="1" v-model.number="config.edgePerlin"
               class="form-range" />
      </div>
      <div>
        <label class="form-label">Cluster Growth Iter: {{ config.clusterGrowthIterations }}</label>
        <input type="range" min="1" max="20" step="1" v-model.number="config.clusterGrowthIterations"
               class="form-range" />
      </div>
      <div>
        <label class="form-label">Cluster Radius: {{ config.clusterRadius }}</label>
        <input type="range" min="1" max="20" step="1" v-model.number="config.clusterRadius"
               class="form-range" />
      </div>
    </template>
  </StepCard>
</template>