<script setup lang="ts">
import { nextTick, onMounted, useTemplateRef, watch } from 'vue'
import type { Point } from '../lib/node-data-types/BaseDataStructure.ts'
import { getPerfectCircleCoords, getRectCenterCoords, interpolateLine } from '../lib/util/data/Grid.ts'
import { makeEditor } from './CanvasPaint/renderer.ts'

type DrawLayer = (ctx: CanvasRenderingContext2D) => void
type Emits = {
  (e: 'setPixels', pixels: Point[]): void,
  (e: 'clear'): void,
}
const emit = defineEmits<Emits>()

const props = withDefaults(defineProps<{
  width?: number
  height?: number
  scale?: number
  cursorColor?: string
  gridColor?: string
  brushShape?: 'circle' | 'square'
  brushSize?: number
  draw?: DrawLayer | null
  id: string
}>(), {
  width: 64,
  height: 64,
  scale: 1,
  cursorColor: '#fff',
  gridColor: 'rgba(0, 0, 0, 0.2)',
  brushShape: 'circle',
  brushSize: 10,
  draw: null,
})

const viewCanvasRef = useTemplateRef<HTMLCanvasElement | null>('viewCanvasRef')

const {
  state,
  updateCursorCache,
  updateGridCache,
  initRenderer,
  queueRender,
  resizeCanvas,
} = makeEditor()

function syncPropsToEditorState() {
  state.width = props.width
  state.height = props.height
  state.scale = props.scale

  state.cursorColor = props.cursorColor
  state.gridColor = props.gridColor

  state.brushShape = props.brushShape
  state.brushSize = props.brushSize
  state.externalDraw = props.draw
}

const canvasFromRef = (canvas: HTMLCanvasElement | null) => {
  if (!canvas) return { canvas, ctx: null }

  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return { canvas, ctx }

  ctx.imageSmoothingEnabled = false

  return { canvas, ctx }
}

const getViewCanvas = () => canvasFromRef(viewCanvasRef.value)

function getCanvasCoords(e: MouseEvent) {
  const rect = viewCanvasRef.value!.getBoundingClientRect()
  return {
    x: Math.floor((e.clientX - rect.left) / state.scale),
    y: Math.floor((e.clientY - rect.top) / state.scale),
  }
}

const paint = (x: number, y: number): void => {
  let pixels: Point[] = []
  const { width, height, brushSize, brushShape } = state
  if (brushShape === 'circle') {
    pixels = getPerfectCircleCoords(x, y, brushSize / 2, width, height)
  } else {
    pixels = getRectCenterCoords(x, y, brushSize, brushSize, width, height)
  }

  emit('setPixels', pixels)
}

const handleMouseDown = (e: MouseEvent): void => {
  state.isDrawing = true
  const { x, y } = getCanvasCoords(e)
  paint(x, y)
  state.lastX = x
  state.lastY = y

  nextTick(() => queueRender())
}

const handleMouseMove = (e: MouseEvent): void => {
  state.mouseIsOver = true
  const { lastX, lastY } = state
  const { x, y } = getCanvasCoords(e)

  state.cursorX = x
  state.cursorY = y

  if (state.isDrawing) {
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

    state.lastX = x
    state.lastY = y
  }

  queueRender()
}

const handleMouseUp = (): void => {
  state.isDrawing = false
}

const handleMouseLeave = (): void => {
  state.isDrawing = false
  state.mouseIsOver = false
  updateCursorCache() // Clear cursor
  queueRender()
}

function fillCanvas(color: string): void {
  const { canvas, ctx } = getViewCanvas()
  if (!ctx || !canvas) return

  ctx.fillStyle = color
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  queueRender()
}

function clearCanvas(): void {
  const { canvas, ctx } = getViewCanvas()
  if (!ctx || !canvas) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  queueRender()
  emit('clear')
}

defineExpose({
  clearCanvas,
  queueRender,
  fillCanvas,
  viewCanvasRef,
})

onMounted(() => {
  syncPropsToEditorState()
  updateGridCache()
  updateCursorCache()
  initRenderer(viewCanvasRef.value!)
  queueRender()
})

watch(
  [
    () => props.scale,
    () => props.gridColor,
  ],
  () => {
    syncPropsToEditorState()
    updateGridCache()
    queueRender()
  },
)

watch([
    () => props.scale,
    () => props.cursorColor,
    () => props.brushShape,
    () => props.brushSize,
  ],
  () => {
    syncPropsToEditorState()
    updateCursorCache()
    queueRender()
  },
)

watch(
  [
    () => props.width,
    () => props.height,
    () => props.scale,
  ],
  () => {
    syncPropsToEditorState()
    resizeCanvas()
    queueRender()
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