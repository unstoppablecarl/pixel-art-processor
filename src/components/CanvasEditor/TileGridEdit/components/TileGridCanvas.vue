<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'
import { DATA_LOCAL_TOOL_ID } from '../../_core-editor-types.ts'
import { createGridMouseHandlers } from '../lib/tile-grid-mouse-handler.ts'
import { type TileGridController } from '../TileGridController.ts'

const {
  localToolManager,
} = defineProps<{
  localToolManager: TileGridController,
}>()

const canvasRef = useTemplateRef<HTMLCanvasElement | null>('canvasRef')

const {
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  handleMouseLeave,
} = createGridMouseHandlers(localToolManager, canvasRef)

onMounted(() => {
  localToolManager.gridRenderer.setTileGridCanvas(canvasRef.value!)
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