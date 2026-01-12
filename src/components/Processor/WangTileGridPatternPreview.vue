<script setup lang="ts">
import { BFormFloatingLabel, BFormInput } from 'bootstrap-vue-next'
import { computed } from 'vue'
import { type AnyNode, isBranch, isStep } from '../../lib/pipeline/Node.ts'
import { usePipelineStore } from '../../lib/store/pipeline-store.ts'
import { usePreviewStore } from '../../lib/store/preview-store.ts'
import { imageDataToUrlImage } from '../../lib/util/ImageData.ts'
import { normalizeValueToArray } from '../../lib/util/misc.ts'
import type { BinaryArray } from '../../lib/util/prng/binary-array-chunks.ts'
import { deepUnwrap } from '../../lib/util/vue-util.ts'
import { makeWangGrid } from '../../lib/wang-tiles/WangGrid.ts'
import { WangTileset } from '../../lib/wang-tiles/WangTileset.ts'

const previewStore = usePreviewStore()
const store = usePipelineStore()

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

const stepOutputNodes = computed(() => {

  let result: ImageOutput[] = []
  store.getLeafNodes().forEach(node => {
    if (isStep(node) || isBranch(node)) {
      if (!node.outputPreview) return
      if (!node.isReady(store)) return
      normalizeValueToArray(node.outputPreview)
        .forEach((p, index) => {
          result.push(make(node, index, p))
        })
    }
  })

  console.log('stepOutputNodes', deepUnwrap(result))
  return result
})

const tileset = computed(() => {
  if (!stepOutputNodes.value.length) return null

  const edges = deepUnwrap(stepOutputNodes.value[0].node.outputMeta.wangTileEdges) as BinaryArray[]
  return WangTileset.createFromColors(edges)
})

const tileGrid = computed(() => {
  if (!tileset.value) return

  return makeWangGrid(previewStore.gridWidth, previewStore.gridHeight, tileset.value)
})

const size = computed(() => {
  let { width, height } = store.getRootNodeOutputSize()
  width *= previewStore.scale
  height *= previewStore.scale

  return { width, height }
})

const cssImageVars = computed(() => {
  if (!stepOutputNodes.value.length) return []

  return stepOutputNodes.value.map(({ node, image }, i) => {
      const encoded = imageDataToUrlImage(image)
      const key = makeImgVar(node, i)
      return `${key}: url(${encoded});`
    },
  )
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

const grid = computed(() => {
  if (!stepOutputNodes.value.length) return null

  if (!tileGrid.value) return

  const result: { index: number, cssStyle: string, node: AnyNode }[][] = []
  for (let y = 0; y < previewStore.gridHeight; y++) {
    result[y] = []
    for (let x = 0; x < previewStore.gridWidth; x++) {

      const tile = tileGrid.value.get(x, y)
      const index = tileset.value?.tiles.indexOf(tile!)
      if (!index) continue
      const item = stepOutputNodes.value[index!]
      if (!item) continue
      const node = item.node

      result[y][x] = {
        index,
        cssStyle: `--node-img-final-preview: var(${makeImgVar(node, index)});`,
        node: node,
      }
    }
  }

  return result
})
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
    <div class="min-vh-100 final-preview" v-if="stepOutputNodes.length">
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
