<script setup lang="ts">
import { BButton, BTab, BTabs } from 'bootstrap-vue-next'
import { shallowReactive } from 'vue'
import { BlobGrower } from '../../lib/generators/BlobGrower.ts'
import { smoothIslandGaussian } from '../../lib/generators/smoothIsland.ts'
import { useStepHandler } from '../../lib/pipeline/useStepHandler.ts'
import { BitMask } from '../../lib/step-data-types/BitMask.ts'
import { IslandType } from '../../lib/step-data-types/BitMask/Island.ts'
import { parseColorData } from '../../lib/util/color.ts'
import { prng } from '../../lib/util/prng.ts'
import { Sketch } from '../../lib/util/Sketch.ts'
import StepCard from '../StepCard.vue'
import CheckboxColor from '../UI/CheckboxColor.vue'

const { stepId } = defineProps<{ stepId: string }>()

const DEFAULT_COLORS = {
  showExpandableBoundsColor: 'rgba(0, 0, 255, 0.5)',
  showExpandableColor: 'rgba(255, 0, 0, 0.5)',
  showExpandableRespectingDistanceColor: 'rgba(0, 255, 0, 0.5)',
  islandColor: 'rgba(255, 255, 255, 1)',
}

const step = useStepHandler(stepId, {
  inputDataTypes: [BitMask],
  outputDataType: BitMask,
  config() {
    return shallowReactive({
      minDistance: 4,

      edgePerlin: 1,
      edgeSmooth: 1,

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

    const sketch = new Sketch(mask.width, mask.height)
    const islandColor = parseColorData(config.islandColor)
    sketch.putImageData(mask.toImageData(islandColor))

    edgeIslands.forEach((i) => {

      if (C.showExpandableBounds) {
        sketch.fillRectBounds(i.expandableBounds, C.showExpandableBoundsColor)
      }

      if (C.showExpandable) {
        i.getExpandable().forEach(({ x, y }) => {
          sketch.setPixel(x, y, C.showExpandableColor)
        })
      }

      if (C.showExpandableRespectingDistance) {
        i.getExpandableRespectingMinDistance(edgeIslands, C.minDistance).forEach(({ x, y }) => {
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
  <StepCard
    :step="step"
    :footer-tabs="true"
  >
    <template #header>
      BitMsk Grow Edge Islands
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
          <div>
            <label class="form-label">Edge Perlin: {{ config.edgePerlin }}</label>
            <input type="range" min="0" max="100" step="1" v-model.number="config.edgePerlin"
                   class="form-range" />
          </div>
          <div>
            <label class="form-label">Edge Smooth: {{ config.edgeSmooth }}</label>
            <input type="range" min="1" max="100" step="1" v-model.number="config.edgeSmooth"
                   class="form-range" />
          </div>

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


          <BButton @click="Object.assign(config, DEFAULT_COLORS)" size="sm" class="mt-2">Reset Colors</BButton>
        </BTab>
      </BTabs>
    </template>
  </StepCard>
</template>