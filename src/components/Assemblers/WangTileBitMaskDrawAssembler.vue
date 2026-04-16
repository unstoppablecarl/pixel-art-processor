<script setup lang="ts">
import { BFormFloatingLabel, BFormInput } from 'bootstrap-vue-next'
import { blendPixelData, imageDataToDataUrl } from 'pixel-data-js'
import { computed } from 'vue'
import { deserializeTileSheet } from '../../CanvasEditor/TileGridEdit/data/TileSheet.ts'
import {
  makeCachedWangTileEdgeColorImageDataComputed,
  makeTileSheetEdgeColorsComputed,
} from '../../CanvasEditor/TileGridEdit/lib/TileSheet-edge-color-computed.ts'
import { type AnyNode } from '../../lib/pipeline/Node.ts'
import { usePipelineStore } from '../../lib/store/pipeline-store.ts'
import { usePreviewStore } from '../../lib/store/preview-store.ts'
import { makeWangGrid } from '../../lib/wang-tiles/WangGrid.ts'
import type { WangTile } from '../../lib/wang-tiles/WangTileset.ts'
import { NODE_WANG_TILE_FORK_DISPLAY_NAME } from '../Node/WangTile/WangTileFork.vue'
import CheckBoxInput from '../UIForms/CheckBoxInput.vue'
import NumberInput from '../UIForms/NumberInput.vue'

const previewStore = usePreviewStore()
const store = usePipelineStore()

const nodesProcessing = computed(() => {
  return !!store.nodesProcessing.length
})

const stepOutputNodes = computed(() => {
  if (nodesProcessing.value) return []

  return store.getLeafNodes().filter(n => (n as AnyNode).outputMeta?.axialEdgeWangTileGrid)
})

const hasOneOutput = computed(() => stepOutputNodes.value.length === 1)

const stepOutputNode = computed(() => {
  if (!hasOneOutput.value) return
  return stepOutputNodes.value[0]
})

const tileSheet = computed(() => {
  if (!stepOutputNode.value) return
  return deserializeTileSheet(stepOutputNode.value.outputMeta.axialEdgeWangTileGrid.tileSheet)
})

const tileset = computed(() => {
  if (!tileSheet.value) return
  return tileSheet.value.tileset
})

const tileGrid = computed(() => {
  if (!tileset.value) return

  return makeWangGrid<number>(previewStore.gridWidth, previewStore.gridHeight, tileset.value)
})

const size = computed(() => {
  if (!tileSheet.value) return { width: 0, height: 0 }
  let { tileSize } = tileSheet.value

  return {
    width: tileSize * previewStore.scale,
    height: tileSize * previewStore.scale,
  }
})

const edgeColors = makeTileSheetEdgeColorsComputed(tileSheet)
const cachedWangTileEdgeColorImageData = makeCachedWangTileEdgeColorImageDataComputed(tileSheet, edgeColors)

const cssImageVars = computed(() => {
  if (!stepOutputNode.value) return null
  if (!tileSheet.value) return null
  const tSheet = tileSheet.value
  const out: string[] = []
  tSheet.each((x, y, t) => {
    const pixelData = tSheet.extractTile(t.id)
    if (previewStore.showEdgeColors) {
      const edge = cachedWangTileEdgeColorImageData.value[t.id]
      blendPixelData(pixelData, edge, { alpha: 255 * previewStore.showEdgeColorsOpacity })
    }

    const encoded = imageDataToDataUrl(pixelData.imageData)
    const key = makeImgVar(stepOutputNode.value!.id, t.id)
    out.push(`${key}: url(${encoded});`)
  })

  return out
})

const cssStyle = computed(() => {
  if (!cssImageVars.value) return
  const { width, height } = size.value
  return [
    `--node-img-width: ${width}px;`,
    `--node-img-height: ${height}px;`,
    `--node-img-final-preview-size: ${width}px ${height}px;`,
    ...cssImageVars.value,
  ].join(' ')
})

const IMAGE_VAR_PREFIX = `--preview-img-list-`
const makeImgVar = (nodeId: string, index: number) => IMAGE_VAR_PREFIX + nodeId + '-' + index

const grid = computed(() => {
  if (!stepOutputNode.value) return
  if (!tileGrid.value) return

  const result: { cssStyle: string, tile: WangTile<number> }[][] = []
  for (let y = 0; y < previewStore.gridHeight; y++) {
    result[y] = []
    for (let x = 0; x < previewStore.gridWidth; x++) {
      const tile = tileGrid.value.get(x, y)!
      result[y][x] = {
        cssStyle: `--node-img-final-preview: var(${makeImgVar(stepOutputNode.value.id, tile.id)});`,
        tile,
      }
    }
  }
  return result
})
</script>
<template>
  <div :style="cssStyle">
    <div class="d-flex flex-nowrap p-3 bg-dark rounded my-3 preview-container-border">
      <div class="fw-bold me-3 py-3">
        {{ NODE_WANG_TILE_FORK_DISPLAY_NAME }} Assembler
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
               step="1"
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
            step="1"
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
            step="1"
            min="1"
            v-model.number="previewStore.gridHeight"
            style="width: 100px"
          />
        </BFormFloatingLabel>
        <CheckBoxInput
          id="preview-show-edge-colors"
          label="Show Edge Colors"
          v-model="previewStore.showEdgeColors"
          class="me-2"
        />
        <NumberInput
          id="preview-show-edge-colors-alpha"
          label="Edge Color Alpha"
          v-model="previewStore.showEdgeColorsOpacity"
          :max="1"
          :step="0.05"
        />
      </div>

      <div v-if="stepOutputNodes.length > 1" class="text-danger-emphasis p-3">
        Only one instance of output node us supported
      </div>
      <div v-else-if="!stepOutputNodes.length" class="text-danger-emphasis p-3">
        No valid output found
      </div>
      <slot name="after"></slot>
    </div>
    <div class="min-vh-100 final-preview" v-if="grid">
      <div v-for="row in grid" class="preview-row">
        <div v-for="{cssStyle, tile} in row" :style="cssStyle" class="draw-preview-cell">
          <div class="draw-label">
            <div>edges: {{ tile.edgesId }}</div>
            <div>id: {{ tile.id }}</div>
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

.preview-container-border {
  border: 1px solid var(--border-color);
}

.draw-preview-cell {
  display: inline-block;
  background-image: var(--node-img-final-preview);
  background-size: var(--node-img-final-preview-size);

  width: var(--node-img-width);
  height: var(--node-img-height);

  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;

  .draw-label {
    opacity: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    padding: 0.25rem;
    vertical-align: middle;

    &:hover {
      opacity: 1;
    }
  }
}
</style>
