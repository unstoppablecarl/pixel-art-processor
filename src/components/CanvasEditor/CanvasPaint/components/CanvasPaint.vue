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

  handleCopy,
  handlePaste,
  handleCut,

  currentCursorCssClass,
} = toolController.getInputHandlers(canvasRef)

onMounted(() => {
  toolController.canvasRenderer.setCanvas(canvasRef.value!)
})

const dataAttr = DATA_LOCAL_TOOL_ID
</script>
<template>
  <canvas
    tabindex="0"
    ref="canvasRef"
    class="canvas-pixel-draw"
    :class="currentCursorCssClass"
    v-bind:[dataAttr]="toolController.id"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"

    @cut="handleCut"
    @copy="handleCopy"
    @paste="handlePaste"
  ></canvas>
</template>
<style lang="scss">
</style>