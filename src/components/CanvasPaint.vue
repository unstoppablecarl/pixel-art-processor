<script setup lang="ts">
import { onMounted, useTemplateRef, watch } from 'vue'
import type { Point } from '../lib/node-data-types/BaseDataStructure.ts'
import { useCanvasPaintStore } from '../lib/store/canvas-paint-store.ts'
import type { ImageDataRef } from '../lib/vue/vue-image-data.ts'
import type { DrawLayer } from './CanvasPaint/_canvas-editor-types.ts'
import { makeEditorState } from './CanvasPaint/editor-state.ts'
import { makeRenderer } from './CanvasPaint/renderer.ts'
import { makeToolManager } from './CanvasPaint/tools.ts'

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
  pixelOverlayDraw?: DrawLayer | null,
  screenOverlayDraw?: DrawLayer | null,
  target: ImageDataRef,
  id: string
}>(), {
  width: 64,
  height: 64,
  scale: 1,
  cursorColor: '#fff',
  gridColor: 'rgba(0, 0, 0, 0.2)',
})

const store = useCanvasPaintStore()
const viewCanvasRef = useTemplateRef<HTMLCanvasElement | null>('viewCanvasRef')

const renderer = makeRenderer(makeEditorState())

const {
  state,
  cursor,
  updateGridCache,
  initRenderer,
  queueRender,
  resizeCanvas,
} = renderer

const tools = makeToolManager(state, renderer)

function syncPropsToEditorState() {
  state.width = props.width
  state.height = props.height
  state.scale = props.scale

  state.cursorColor = props.cursorColor
  state.gridColor = props.gridColor

  state.brushShape = store.brushShape
  state.brushSize = store.brushSize
  state.tool = store.currentTool

  state.emitSetPixels = (pixels: Point[]) => emit('setPixels', pixels)

  state.target = props.target

  state.pixelOverlayDraw = (ctx) => {
    props?.pixelOverlayDraw?.(ctx)
    tools.currentToolPixelOverlayDraw(ctx)
  }
  state.screenOverlayDraw = (ctx) => {
    props?.screenOverlayDraw?.(ctx)
    tools.currentToolScreenOverlayDraw(ctx)
  }
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

const handleMouseDown = (e: MouseEvent): void => {
  const { x, y } = getCanvasCoords(e)
  tools.onMouseDown(x, y)
}

const handleMouseMove = (e: MouseEvent): void => {
  const { x, y } = getCanvasCoords(e)
  tools.onMouseMove(x, y)
}

const handleMouseUp = (e: MouseEvent): void => {
  const { x, y } = getCanvasCoords(e)
  tools.onMouseUp(x, y)
}

const handleMouseLeave = (): void => tools.onMouseLeave()

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
  cursor.updateCache()
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
    () => store.brushShape,
    () => store.brushSize,
  ],
  () => {
    syncPropsToEditorState()
    cursor.updateCache()
    queueRender()
  },
)

watch(() => store.currentTool, () => {
  tools.setTool(store.currentTool)
  queueRender()
})

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