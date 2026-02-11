<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'
import { DATA_LOCAL_TOOL_ID } from '../../_core/_core-editor-types.ts'
import type { CanvasPaintController } from '../CanvasPaintController.ts'

const {
  toolController,
} = defineProps<{
  toolController: CanvasPaintController,
}>()

const canvasRef = useTemplateRef<HTMLCanvasElement | null>('canvasRef')

const {
  handleMouseDown,
  handleMouseMove,
  handleMouseLeave,
  currentCursorCssClass
} = toolController.getInputHandlers(canvasRef)

onMounted(() => {
  toolController.canvasRenderer.setCanvas(canvasRef.value!)
})

const dataAttr = DATA_LOCAL_TOOL_ID
</script>
<template>
  <canvas
    ref="canvasRef"
    class="canvas-pixel-draw"
    :class="currentCursorCssClass"
    v-bind:[dataAttr]="toolController.id"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
  ></canvas>
</template>
<style lang="scss">
</style>