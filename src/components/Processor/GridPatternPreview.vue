<script setup lang="ts">
import { BFormFloatingLabel, BFormInput } from 'bootstrap-vue-next'
import { computed } from 'vue'
import type { AnyNode } from '../../lib/pipeline/Node.ts'
import { usePipelineStore } from '../../lib/store/pipeline-store.ts'
import { usePreviewStore } from '../../lib/store/preview-store.ts'
import { imageDataToUrlImage } from '../../lib/util/ImageData.ts'
import { normalizeValueToArray } from '../../lib/util/misc.ts'
import { makePrng } from '../../lib/util/prng.ts'

const previewStore = usePreviewStore()
const store = usePipelineStore()

const prng = computed(() => makePrng(previewStore.seed))

type ImageOutput = {
  index: number,
  node: AnyNode,
  image: ImageData
  key: string,
  encoded: string,
}

function make(node: AnyNode, outputIndex: number, outputPreview: ImageData): ImageOutput {
  const key = makeImgVar(node, outputIndex)
  const encoded = imageDataToUrlImage(outputPreview)
  return {
    node,
    key,
    index: outputIndex,
    image: outputPreview,
    encoded: `${key}: url(${encoded});`,
  }
}

const stepOutputImages = computed(() => {
  let result: ImageOutput[] = []
  store.getLeafNodes().forEach(node => {
    if (!node.outputPreview) return

    normalizeValueToArray(node.outputPreview)
      .forEach((p, index) => {
        result.push(make(node, index, p))
      })
  })
  return result
})

const size = computed(() => {
  let { width, height } = store.getRootNodeOutputSize()
  width *= previewStore.scale
  height *= previewStore.scale

  return { width, height }
})

const cssStyle = computed(() => {
  const { width, height } = size.value
  return [
    `--node-img-width: ${width}px;`,
    `--node-img-height: ${height}px;`,
    `--node-img-final-preview-size: ${width}px ${height}px;`,
    ...cssImageVars.value,
  ].join(' ')
})

const IMAGE_VAR_PREFIX = `--preview-img-list-`
const makeImgVar = (node: AnyNode, index: number) => IMAGE_VAR_PREFIX + node.id + index

const cssImageVars = computed(() => stepOutputImages.value.map(({ node, image }, i) => {
    const encoded = imageDataToUrlImage(image)
    const key = makeImgVar(node, i)
    return `${key}: url(${encoded});`
  },
))

const grid = computed(() => {
    const result: { index: number, cssStyle: string, node: AnyNode }[][] = []
    for (let i = 0; i < previewStore.gridHeight; i++) {
      result[i] = []
      for (let j = 0; j < previewStore.gridWidth; j++) {

        const index = prng.value.randomArrayIndex(stepOutputImages.value)
        const node = stepOutputImages.value[index].node

        result[i][j] = {
          index,
          cssStyle: `--node-img-final-preview: var(${makeImgVar(node, index)});`,
          node: node,
        }
      }
    }

    return result
  },
)
</script>
<template>
  <div :style="cssStyle">
    <div class="w-100 d-flex flex-nowrap p-3 bg-dark border-top border-bottom">
      <div class="fw-bold me-3 py-3">
        Pattern Preview
      </div>

      <div class="form-group d-flex align-items-center gap-2 mb-0">
        <label
          for="scale"
          class="form-label form-label-sm mb-0 text-nowrap d-inline-block"
        >
          Scale: {{ previewStore.scale }}
        </label>
        <input type="range"
               class="form-range form-range-sm"
               id="scale"
               min="1"
               max="10"
               node="1"
               style="width: 150px;"
               v-model.number="previewStore.scale"
        >

        <BFormFloatingLabel
          label="Width"
          label-for="preview-width"
        >
          <BFormInput
            id="preview-width"
            type="number"
            node="1"
            min="1"
            v-model.number="previewStore.gridWidth"
            style="width: 100px"
          />
        </BFormFloatingLabel>

        <BFormFloatingLabel
          label="Height"
          label-for="preview-height"
        >
          <BFormInput
            id="preview-height"
            type="number"
            node="1"
            min="1"
            v-model.number="previewStore.gridHeight"
            style="width: 100px"
          />
        </BFormFloatingLabel>

        <BFormFloatingLabel
          label="Seed"
          label-for="preview-seed"
        >
          <BFormInput
            id="preview-seed"
            type="number"
            node="1"
            min="1"
            v-model.number="previewStore.seed"
            style="width: 100px"
          />
        </BFormFloatingLabel>

      </div>

    </div>
    <div class="min-vh-100 final-preview" v-if="stepOutputImages.length">
      <div v-for="row in grid" class="preview-row">
        <div v-for="{index, cssStyle, node} in row" :style="cssStyle" class="preview-cell">
          <div class="label">
            <div>index: {{ index }}</div>
            <div>id: {{ node.id }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style lang="scss">

.preview-row {
  height: var(--node-img-height);
}

.preview-cell {
  display: inline-block;
  background-image: var(--node-img-final-preview);
  background-size: var(--node-img-final-preview-size);

  width: var(--node-img-width);
  height: var(--node-img-height);

  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;

  .label {
    opacity: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    padding: 2rem;
    vertical-align: middle;
  }

  .label:hover {
    opacity: 1;
  }
}
</style>
