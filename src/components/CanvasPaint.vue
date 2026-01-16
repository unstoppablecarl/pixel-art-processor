<script setup lang="ts">
import { computed, onMounted, ref, Ref, useTemplateRef, watch } from 'vue'
import type { Position } from '../lib/pipeline/_types.ts'
import { ImageDataMutator, interpolateLine } from '../lib/util/canvas/canvas-paint.ts'
import { parseColorData } from '../lib/util/color.ts'
import { throttle } from '../lib/util/misc.ts'

type Emits = {
  (e: 'imageUpdated', value: ImageData | null): void;
}

const emit = defineEmits<Emits>()

const {
  width = 64,
  height = 64,
  color = '#00ff00',
  cursorColor = '#fff',
  gridColor = 'rgba(0, 0, 0, 0.2)',
  brushShape = 'circle',
  brushSize = 10,
  scale = 1,
  imageData,
} = defineProps<{
  width: number,
  height: number,
  bgColor?: string,
  cursorColor?: string,
  gridColor?: string,
  color?: string,
  brushShape?: 'circle' | 'square',
  brushSize?: number,
  scale?: number,
  imageData: ImageData | null,
}>()

const buffer = new ImageDataMutator()

const offset = defineModel<Position>('offset', { default: { x: 0, y: 0 } })
// const imageData = defineModel<ImageData | null>('imageData', { required: true })

const viewCanvasRef = useTemplateRef<HTMLCanvasElement | null>('viewCanvasRef')

const isDrawing: Ref<boolean> = ref(false)
const lastPos: Ref<Position> = ref({ x: 0, y: 0 })
const cursorPos: Ref<Position | null> = ref(null)

const colorRGBA = computed(() => parseColorData(color))
const canvasFromRef = (canvas: HTMLCanvasElement | null) => {
  if (!canvas) return { canvas, ctx: null }

  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return { canvas, ctx }

  ctx.imageSmoothingEnabled = false

  return { canvas, ctx }
}

const getViewCanvas = () => canvasFromRef(viewCanvasRef.value)

const updateImageData = throttle(() => {
  emit('imageUpdated', buffer.imageData)
}, 10)

const updateSize = () => {
  const viewCanvas = viewCanvasRef.value
  if (!viewCanvas) return

  const scaledWidth = Math.floor(width * scale)
  const scaledHeight = Math.floor(height * scale)

  // Resize the view canvas to match scaled dimensions
  if (viewCanvas.width !== scaledWidth || viewCanvas.height !== scaledHeight) {
    viewCanvas.width = scaledWidth
    viewCanvas.height = scaledHeight
    return true
  }
  return false
}
const drawGrid = (ctx: CanvasRenderingContext2D, { width, height }: { width: number, height: number }) => {
  ctx.setTransform(1, 0, 0, 1, 0, 0)

  ctx.strokeStyle = gridColor
  ctx.lineWidth = 1

  const startX = Math.floor(-offset.value.x)
  const startY = Math.floor(-offset.value.y)
  const endX = Math.ceil((width / scale) - offset.value.x)
  const endY = Math.ceil((height / scale) - offset.value.y)

  for (let x = startX; x <= endX; x++) {
    const screenX = (x + offset.value.x) * scale
    ctx.beginPath()
    ctx.moveTo(screenX, 0)
    ctx.lineTo(screenX, height)
    ctx.stroke()
  }

  for (let y = startY; y <= endY; y++) {
    const screenY = (y + offset.value.y) * scale
    ctx.beginPath()
    ctx.moveTo(0, screenY)
    ctx.lineTo(width, screenY)
    ctx.stroke()
  }
}

const drawCursor = (ctx: CanvasRenderingContext2D) => {
  if (!cursorPos.value) return

  ctx.setTransform(1, 0, 0, 1, 0, 0)

  ctx.strokeStyle = cursorColor
  ctx.lineWidth = 1

  const snappedX = Math.floor(cursorPos.value.x)
  const snappedY = Math.floor(cursorPos.value.y)

  if (brushShape === 'circle') {
    const r = Math.floor(brushSize / 2)
    const r2 = r * r

    ctx.beginPath()

    // Trace the outline by checking each pixel and drawing edges
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y < r2) {
          const pixelX = snappedX + x
          const pixelY = snappedY + y
          const screenX = (pixelX + offset.value.x) * scale
          const screenY = (pixelY + offset.value.y) * scale

          // Check each edge and draw if neighbor is outside circle (draw on the outside)
          if ((x - 1) * (x - 1) + y * y >= r2) { // Left edge
            ctx.moveTo(screenX - 0.5, screenY)
            ctx.lineTo(screenX - 0.5, screenY + scale)
          }
          if ((x + 1) * (x + 1) + y * y >= r2) { // Right edge
            ctx.moveTo(screenX + scale + 0.5, screenY)
            ctx.lineTo(screenX + scale + 0.5, screenY + scale)
          }
          if (x * x + (y - 1) * (y - 1) >= r2) { // Top edge
            ctx.moveTo(screenX, screenY - 0.5)
            ctx.lineTo(screenX + scale, screenY - 0.5)
          }
          if (x * x + (y + 1) * (y + 1) >= r2) { // Bottom edge
            ctx.moveTo(screenX, screenY + scale + 0.5)
            ctx.lineTo(screenX + scale, screenY + scale + 0.5)
          }
        }
      }
    }

    ctx.stroke()
  } else {
    const halfSize = Math.floor(brushSize / 2)
    const startX = (snappedX - halfSize + offset.value.x) * scale
    const startY = (snappedY - halfSize + offset.value.y) * scale
    const size = brushSize * scale

    ctx.strokeRect(startX - 0.5, startY - 0.5, size + 1, size + 1)
  }

  // Re-apply transform
  ctx.translate(offset.value.x * scale, offset.value.y * scale)
  ctx.scale(scale, scale)
}

const updateView = () => {
  const { ctx, canvas } = getViewCanvas()
  if (!ctx || !canvas) return

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  ctx.translate(offset.value.x, offset.value.y)
  ctx.scale(scale, scale)

  buffer.drawOnto(ctx)
  // Only show grid when zoomed in enough
  if (scale >= 4) {
    drawGrid(ctx, canvas)
  }

  drawCursor(ctx)
}
const getCanvasCoords = (e: MouseEvent): Position => {
  const canvas = viewCanvasRef.value
  if (!canvas) return { x: 0, y: 0 }

  const rect = canvas.getBoundingClientRect()
  const x = (e.clientX - rect.left) / scale - offset.value.x
  const y = (e.clientY - rect.top) / scale - offset.value.y

  return { x, y }
}

const draw = (x: number, y: number): void => {
  if (brushShape === 'circle') {
    buffer.drawPixelPerfectCircle(x, y, brushSize / 2, colorRGBA.value)
  } else {
    buffer.strokeRect(x, y, brushSize, brushSize, colorRGBA.value)
  }
}

const handleMouseDown = (e: MouseEvent): void => {
  isDrawing.value = true
  const { x, y } = getCanvasCoords(e)
  draw(x, y)
  lastPos.value = { x, y }

  updateImageData()
  updateView()
}

const handleMouseMove = (e: MouseEvent): void => {
  const { x, y } = getCanvasCoords(e)
  cursorPos.value = { x, y }

  if (isDrawing.value) {

    // Interpolate between last position and current position
    const points = interpolateLine(
      Math.floor(lastPos.value.x),
      Math.floor(lastPos.value.y),
      Math.floor(x),
      Math.floor(y),
    )

    for (const point of points) {
      const ix = Math.floor(point.x)
      const iy = Math.floor(point.y)
      draw(ix, iy)
    }

    updateView()
    updateImageData()
    lastPos.value = { x, y }
  } else {
    // Update cursor preview when just hovering
    updateView()
  }
}

const handleMouseUp = (): void => {
  isDrawing.value = false
}

const handleMouseLeave = (): void => {
  isDrawing.value = false
  cursorPos.value = null
  updateView()
}

function fillCanvas(color: string): void {
  const { canvas, ctx } = getViewCanvas()
  if (!ctx || !canvas) return

  ctx.fillStyle = color
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  updateView()
  updateImageData()
}

function clearCanvas(): void {
  const { canvas, ctx } = getViewCanvas()
  if (!ctx || !canvas) return
  buffer.imageData?.data.fill(0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  updateView()
  updateImageData()
}

defineExpose({
  clearCanvas,
  fillCanvas,
})

onMounted(() => {
  updateSize()
  const { ctx } = getViewCanvas()
  if (!ctx) return

  if (imageData) {
    buffer.set(imageData)
    updateView()
  } else {
    buffer.set(new ImageData(width, height))
    buffer.clear()
    updateView()
  }
})

watch([
  () => gridColor,
  () => scale,
], () => {
  updateView()
}, { deep: true })

watch([
    () => width,
    () => height,
  ],
  () => {
    const { canvas } = getViewCanvas()
    if (!canvas) return

    buffer.resize(width, height)

    if (updateSize()) {
      updateImageData()
      updateView()
    }
  })

watch([
  () => brushSize,
  () => brushShape,
  () => color,
  () => cursorColor,
], () => {
  if (cursorPos.value) {
    updateView()
  }
})

</script>
<template>
  <canvas
    ref="viewCanvasRef"
    :style="{
      cursor: 'crosshair',
      width: (width * scale) + 'px',
      height: (height * scale) + 'px'
    }"
    class="draw-canvas"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseLeave"
  ></canvas>
</template>
<style>
.draw-canvas {
  image-rendering: pixelated;
}
</style>