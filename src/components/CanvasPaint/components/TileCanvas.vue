<script setup lang="ts">
import { onMounted, useTemplateRef, watch } from 'vue'
import { useCanvasPaintStore } from '../../../lib/store/canvas-paint-store.ts'
import type { TileId } from '../../../lib/wang-tiles/WangTileset.ts'
import { createTileMouseHandlers } from '../lib/canvas-mouse.ts'
import { type LocalToolManager } from '../LocalToolManager.ts'

const store = useCanvasPaintStore()

const {
  tileId,
  localToolManager,
} = defineProps<{
  tileId: TileId,
  localToolManager: LocalToolManager,
}>()

const viewCanvasRef = useTemplateRef<HTMLCanvasElement | null>('viewCanvasRef')

const tools = localToolManager
const {
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  handleMouseLeave,
} = createTileMouseHandlers(localToolManager, viewCanvasRef, tileId)

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