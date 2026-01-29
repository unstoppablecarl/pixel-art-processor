<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'
import { DATA_LOCAL_TOOL_ID } from '../../_canvas-editor-types.ts'
import { createGridMouseHandlers } from '../lib/canvas-mouse.ts'
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
} = createGridMouseHandlers(localToolManager, viewCanvasRef)

onMounted(() => {
  localToolManager.gridRenderer.setTileGridCanvas(viewCanvasRef.value!)
})
const dataAttr = DATA_LOCAL_TOOL_ID
</script>
<template>
  <canvas
    ref="viewCanvasRef"
    class="draw-canvas"
    v-bind:[dataAttr]="localToolManager.id"
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