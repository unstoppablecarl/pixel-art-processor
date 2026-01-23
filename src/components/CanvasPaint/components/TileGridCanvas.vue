<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'
import { createMouseHandlers } from '../lib/canvas-mouse.ts'
import { type LocalToolManager } from '../LocalToolManager.ts'

const {
  localToolManager,
} = defineProps<{
  localToolManager: LocalToolManager,
}>()

const viewCanvasRef = useTemplateRef<HTMLCanvasElement | null>('viewCanvasRef')

const {
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  handleMouseLeave,
} = createMouseHandlers(localToolManager, viewCanvasRef)

onMounted(() => {
  localToolManager.gridRenderer.setTileGridCanvas(viewCanvasRef.value!)
})

</script>
<template>
  <canvas
    ref="viewCanvasRef"
    class="draw-canvas"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseLeave"
  ></canvas>
</template>
<style lang="scss">
.draw-canvas {
  image-rendering: pixelated;
  cursor: crosshair;
}
</style>