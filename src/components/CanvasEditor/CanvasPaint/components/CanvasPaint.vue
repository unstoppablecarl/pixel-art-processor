<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'
import { DATA_LOCAL_TOOL_ID } from '../../_core-editor-types.ts'
import type { CanvasPaintController } from '../CanvasPaintController.ts'
import { createCanvasPaintMouseHandlers } from '../lib/canvas-paint-mouse-handler.ts'

const {
  localToolManager,
} = defineProps<{
  localToolManager: CanvasPaintController,
}>()

const canvasRef = useTemplateRef<HTMLCanvasElement | null>('canvasRef')

const tools = localToolManager
const {
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  handleMouseLeave,
} = createCanvasPaintMouseHandlers(localToolManager, canvasRef)

onMounted(() => {
  tools.canvasRenderer.setCanvas(canvasRef.value!)
})

const dataAttr = DATA_LOCAL_TOOL_ID
</script>
<template>
  <canvas
    ref="canvasRef"
    class="canvas-pixel-draw"
    v-bind:[dataAttr]="localToolManager.id"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseLeave"
  ></canvas>
</template>
<style lang="scss">
</style>