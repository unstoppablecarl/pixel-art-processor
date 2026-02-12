<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'
import type { TileId } from '../../../../lib/wang-tiles/WangTileset.ts'
import { DATA_LOCAL_TOOL_ID } from '../../_core/_core-editor-types.ts'
import { CanvasType } from '../_tile-grid-editor-types.ts'
import { type TileGridController } from '../TileGridController.ts'

const {
  tileId,
  toolController,
} = defineProps<{
  tileId: TileId,
  toolController: TileGridController,
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
} = toolController.getInputHandlers(canvasRef, CanvasType.TILE, tileId)

onMounted(() => {
  toolController.gridRenderer.registerTileCanvas(tileId, canvasRef.value!)
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