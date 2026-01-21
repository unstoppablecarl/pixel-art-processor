<script setup lang="ts">
import { nextTick, onMounted, useTemplateRef, watch } from 'vue'
import type { Point } from '../lib/node-data-types/BaseDataStructure.ts'
import { getPerfectCircleCoords, getRectCenterCoords, interpolateLine } from '../lib/util/data/Grid.ts'
import { editorState } from './CanvasPaint/editorState.ts'
import {
  drawCursor,
  drawGrid,
  initRenderer,
  scheduleRender,
  updateCursorCache,
  updateGridCache,
} from './CanvasPaint/renderer.ts'

type DrawLayer = (ctx: CanvasRenderingContext2D) => void
type Emits = {
  (e: 'setPixels', pixels: Point[]): void,
  (e: 'clear'): void,
}
const emit = defineEmits<Emits>()

const {
  width = 64,
  height = 64,
  cursorColor = '#fff',
  gridColor = 'rgba(0, 0, 0, 0.2)',
  brushShape = 'circle',
  brushSize = 10,
  scale = 1,
  draw = null,
  id,
} = defineProps<{
  width?: number,
  height?: number,
  scale?: number,
  cursorColor?: string,
  gridColor?: string,
  brushShape?: 'circle' | 'square',
  brushSize?: number,
  draw?: DrawLayer | null,
  id: string,
}>()

const viewCanvasRef = useTemplateRef<HTMLCanvasElement | null>('viewCanvasRef')

function syncPropsToEditorState() {
  editorState.width = width
  editorState.height = height
  editorState.scale = scale

  editorState.cursorColor = cursorColor
  editorState.gridColor = gridColor

  editorState.brushShape = brushShape
  editorState.brushSize = brushSize
  editorState.externalDraw = draw
}

const canvasFromRef = (canvas: HTMLCanvasElement | null) => {
  if (!canvas) return { canvas, ctx: null }

  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return { canvas, ctx }

  ctx.imageSmoothingEnabled = false

  return { canvas, ctx }
}

const getViewCanvas = () => canvasFromRef(viewCanvasRef.value)

function resizeCanvas() {
  const viewCanvas = viewCanvasRef.value
  if (!viewCanvas) return
  const { scaledWidth, scaledHeight } = editorState
  if (viewCanvas.width !== scaledWidth || viewCanvas.height !== scaledHeight) {

    viewCanvas.width = scaledWidth
    viewCanvas.height = scaledHeight
    return true
  }
  return false
}

const updateView = () => {
  requestAnimationFrame(() => {
    const { ctx, canvas } = getViewCanvas()
    if (!ctx || !canvas) return

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw the image data scaled up
    ctx.scale(scale, scale)

    draw?.(ctx)

    // Reset transform for overlays
    ctx.setTransform(1, 0, 0, 1, 0, 0)

    // Blit cached grid (if scale is high enough)
    if (scale >= 4) {
      drawGrid(ctx)
    }

    if (editorState.mouseIsOver) {
      drawCursor(ctx)
    }
  })
}

function getCanvasCoords(e: MouseEvent) {
  const rect = viewCanvasRef.value!.getBoundingClientRect()
  return {
    x: Math.floor((e.clientX - rect.left) / editorState.scale),
    y: Math.floor((e.clientY - rect.top) / editorState.scale),
  }
}

const paint = (x: number, y: number): void => {
  let pixels: Point[] = []
  if (brushShape === 'circle') {
    pixels = getPerfectCircleCoords(x, y, brushSize / 2, width, height)
  } else {
    pixels = getRectCenterCoords(x, y, brushSize, brushSize, width, height)
  }

  emit('setPixels', pixels)
}

const handleMouseDown = (e: MouseEvent): void => {
  editorState.isDrawing = true
  const { x, y } = getCanvasCoords(e)
  paint(x, y)
  editorState.lastX = x
  editorState.lastY = y

  nextTick(() => updateView())
}

const handleMouseMove = (e: MouseEvent): void => {
  editorState.mouseIsOver = true
  const { lastX, lastY } = editorState
  const { x, y } = getCanvasCoords(e)

  editorState.cursorX = x
  editorState.cursorY = y

  if (editorState.isDrawing) {
    // Interpolate between last position and current position
    const points = interpolateLine(
      Math.floor(lastX),
      Math.floor(lastY),
      Math.floor(x),
      Math.floor(y),
    )

    for (const point of points) {
      const ix = Math.floor(point.x)
      const iy = Math.floor(point.y)
      paint(ix, iy)
    }

    editorState.lastX = x
    editorState.lastY = y
  }

  updateView()
}

const handleMouseUp = (): void => {
  editorState.isDrawing = false
}

const handleMouseLeave = (): void => {
  editorState.isDrawing = false
  editorState.mouseIsOver = false
  updateCursorCache() // Clear cursor
  updateView()
}

function fillCanvas(color: string): void {
  const { canvas, ctx } = getViewCanvas()
  if (!ctx || !canvas) return

  ctx.fillStyle = color
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  updateView()
}

function clearCanvas(): void {
  const { canvas, ctx } = getViewCanvas()
  if (!ctx || !canvas) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  updateView()
  emit('clear')
}

defineExpose({
  clearCanvas,
  fillCanvas,
  updateView,
  viewCanvasRef,
})

onMounted(() => {
  syncPropsToEditorState()
  updateGridCache()
  updateCursorCache()
  initRenderer(viewCanvasRef.value!)
  updateView()
})

watch(
  () => gridColor,
  () => {
    syncPropsToEditorState()
    updateGridCache()
    scheduleRender()
  },
)

watch([
    () => cursorColor,
    () => brushShape,
    () => brushSize,
  ],
  () => {
    syncPropsToEditorState()
    updateCursorCache()
    scheduleRender()
  },
)

watch(
  [
    () => width,
    () => height,
    () => scale,
  ],
  () => {
    syncPropsToEditorState()
    resizeCanvas()
    scheduleRender()
  },
)
</script>
<template>
  <canvas
    :id="id"
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