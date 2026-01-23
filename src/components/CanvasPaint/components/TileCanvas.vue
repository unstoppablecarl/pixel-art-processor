<script setup lang="ts">
import { onMounted, useTemplateRef, watch } from 'vue'
import type { Point } from '../../../lib/node-data-types/BaseDataStructure.ts'
import { useCanvasPaintStore } from '../../../lib/store/canvas-paint-store.ts'
import type { TileId } from '../../../lib/wang-tiles/WangTileset.ts'
import { createMouseHandlers } from '../lib/canvas-mouse.ts'
import { type LocalToolManager } from '../LocalToolManager.ts'

const store = useCanvasPaintStore()

const {
  tileId,
  localToolManager,
  transformMouseCoords,
} = defineProps<{
  tileId: TileId,
  localToolManager: LocalToolManager,
  transformMouseCoords?: (point: Point) => Point,
}>()

const viewCanvasRef = useTemplateRef<HTMLCanvasElement | null>('viewCanvasRef')

const tools = localToolManager
const {
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  handleMouseLeave,
} = createMouseHandlers(localToolManager, viewCanvasRef, transformMouseCoords)

onMounted(() => {
  tools.gridRenderer.registerTileCanvas(tileId, viewCanvasRef.value!)
})

watch(() => store.brushSize, () => {
  localToolManager.gridRenderer.cursor.updateCache()
}, { immediate: true })

</script>
<template>
  <canvas
    ref="viewCanvasRef"
    class="draw-canvas-tile"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseLeave"
  ></canvas>
</template>
<style lang="scss">
.draw-canvas-tile {
  image-rendering: pixelated;
  cursor: crosshair;
}
</style>