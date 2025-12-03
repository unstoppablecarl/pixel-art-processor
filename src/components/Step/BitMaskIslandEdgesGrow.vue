<script setup lang="ts">
import { shallowReactive } from 'vue'
import { BlobGrower } from '../../lib/generators/BlobGrower.ts'
import { smoothIslandGaussian } from '../../lib/generators/smoothIsland.ts'
import { useStepHandler } from '../../lib/pipeline/useStepHandler.ts'
import { BitMask, IslandType } from '../../lib/step-data-types/BitMask.ts'
import { setImageDataPixelColor } from '../../lib/util/ImageData.ts'
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
    })
  },
  run({ config, inputData }) {
    if (!inputData) return

    const mask = inputData as BitMask
    const islands = mask.getIslands()
    const C = config

    const edgeIslands = islands.filter(i => i.type !== IslandType.NORMAL)

    const edgeGrower = new BlobGrower(mask, islands, prng, config.minDistance, (i) => i.type !== IslandType.NORMAL)
    edgeGrower.perlinLikeGrowth(C.edgePerlin)

    edgeIslands.forEach(i => {
      smoothIslandGaussian(i, C.edgeSmooth, (x, y) => {
        return !mask.isWithinBorder(x, y, 2)
      })
    })

    const preview = mask.toImageData()
    edgeIslands.forEach((i) => {
      i.getExpandable().forEach(({ x, y }) => {
        setImageDataPixelColor(preview, x, y, { r: 255, g: 0, b: 0, a: 255 })
      })

      i.getExpandableRespectingMinDistance(edgeIslands, C.minDistance).forEach(({ x, y }) => {
        setImageDataPixelColor(preview, x, y, { r: 0, g: 0, b: 255, a: 255 })
      })

      i.each((x, y, v) => {
        if (v) {
          setImageDataPixelColor(preview, x, y, { r: 0, g: 255, b: 0, a: 255 })
        }
      })
    })
    return {
      output: mask,
      preview,
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
      BitMsk Grow Edge Islands
    </template>
    <template #footer>
      <div>
        <label class="form-label">Min Dist: {{ config.minDistance }}</label>
        <input type="range" min="1" max="20" step="1" v-model.number="config.minDistance"
               class="form-range" />
      </div>
      <div>
        <label class="form-label">Edge Perlin: {{ config.edgePerlin }}</label>
        <input type="range" min="1" max="100" step="1" v-model.number="config.edgePerlin"
               class="form-range" />
      </div>
      <div>
        <label class="form-label">Edge Smooth: {{ config.edgeSmooth }}</label>
        <input type="range" min="1" max="100" step="1" v-model.number="config.edgeSmooth"
               class="form-range" />
      </div>
    </template>
  </StepCard>
</template>