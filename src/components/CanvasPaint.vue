<script setup lang="ts">
import { computed, onMounted, ref, Ref, useTemplateRef, watch } from 'vue'
import type { Position } from '../lib/pipeline/_types.ts'
import { ImageDataMutator, interpolateLine } from '../lib/util/html-dom/ImageDataMutator.ts'
import { parseColor } from '../lib/util/color.ts'
import { throttle } from '../lib/util/misc.ts'
import type { ImageDataRef } from '../lib/vue/vue-image-data.ts'

const {
  imageDataRef,
  width = 64,
  height = 64,
  color = '#00ff00',
  cursorColor = '#fff',
  gridColor = 'rgba(0, 0, 0, 0.2)',
  brushShape = 'circle',
  brushSize = 10,
  scale = 1,
  throttleMs = 300
} = defineProps<{
  imageDataRef: ImageDataRef,
  width?: number,
  height?: number,
  bgColor?: string,
  cursorColor?: string,
  gridColor?: string,
  color?: string,
  brushShape?: 'circle' | 'square',
  brushSize?: number,
  scale?: number,
  throttleMs?: number,
}>()

const buffer = new ImageDataMutator()

const viewCanvasRef = useTemplateRef<HTMLCanvasElement | null>('viewCanvasRef')

const isDrawing: Ref<boolean> = ref(false)
const lastPos: Ref<Position> = ref({ x: 0, y: 0 })
const cursorPos: Ref<Position | null> = ref(null)

const colorRGBA = computed(() => parseColor(color))

const scaledWidth = computed(() => Math.floor(width * scale))
const scaledHeight = computed(() => Math.floor(height * scale))

const canvasFromRef = (canvas: HTMLCanvasElement | null) => {
  if (!canvas) return { canvas, ctx: null }

  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return { canvas, ctx }

  ctx.imageSmoothingEnabled = false

  return { canvas, ctx }
}

const getViewCanvas = () => canvasFromRef(viewCanvasRef.value)

const updateImageData = throttle(() => {
  imageDataRef.set(buffer.imageData)
}, throttleMs)

const updateSize = () => {
  const viewCanvas = viewCanvasRef.value
  if (!viewCanvas) return

  // Set canvas internal dimensions to match the scaled view
  if (viewCanvas.width !== scaledWidth.value || viewCanvas.height !== scaledHeight.value) {
    viewCanvas.width = scaledWidth.value
    viewCanvas.height = scaledHeight.value
    return true
  }
  return false
}

const drawGrid = (ctx: CanvasRenderingContext2D) => {
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)

  ctx.strokeStyle = gridColor
  ctx.lineWidth = 1

  // Draw vertical lines
  for (let x = 0; x <= width; x++) {
    const screenX = x * scale
    ctx.beginPath()
    ctx.moveTo(screenX, 0)
    ctx.lineTo(screenX, scaledHeight.value)
    ctx.stroke()
  }

  // Draw horizontal lines
  for (let y = 0; y <= height; y++) {
    const screenY = y * scale
    ctx.beginPath()
    ctx.moveTo(0, screenY)
    ctx.lineTo(scaledWidth.value, screenY)
    ctx.stroke()
  }

  ctx.restore()
}

const drawCursor = (ctx: CanvasRenderingContext2D) => {
  if (!cursorPos.value) return

  ctx.save()
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
          const screenX = pixelX * scale
          const screenY = pixelY * scale

          // Check each edge and draw if neighbor is outside circle
          if ((x - 1) * (x - 1) + y * y >= r2) { // Left edge
            ctx.moveTo(screenX, screenY)
            ctx.lineTo(screenX, screenY + scale)
          }
          if ((x + 1) * (x + 1) + y * y >= r2) { // Right edge
            ctx.moveTo(screenX + scale, screenY)
            ctx.lineTo(screenX + scale, screenY + scale)
          }
          if (x * x + (y - 1) * (y - 1) >= r2) { // Top edge
            ctx.moveTo(screenX, screenY)
            ctx.lineTo(screenX + scale, screenY)
          }
          if (x * x + (y + 1) * (y + 1) >= r2) { // Bottom edge
            ctx.moveTo(screenX, screenY + scale)
            ctx.lineTo(screenX + scale, screenY + scale)
          }
        }
      }
    }

    ctx.stroke()
  } else {
    const halfSize = Math.floor(brushSize / 2)
    const startX = (snappedX - halfSize) * scale
    const startY = (snappedY - halfSize) * scale
    const size = brushSize * scale

    ctx.strokeRect(startX, startY, size, size)
  }

  ctx.restore()
}

const updateView = () => {
  const { ctx, canvas } = getViewCanvas()
  if (!ctx || !canvas) return

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Draw the image data scaled up
  ctx.scale(scale, scale)
  buffer.drawOnto(ctx)

  // Draw grid and cursor (these handle their own transforms)
  if (scale >= 4) {
    drawGrid(ctx)
  }
  drawCursor(ctx)
}

const getCanvasCoords = (e: MouseEvent): Position => {
  const canvas = viewCanvasRef.value
  if (!canvas) return { x: 0, y: 0 }

  const rect = canvas.getBoundingClientRect()

  // Get position in screen pixels
  const screenX = e.clientX - rect.left
  const screenY = e.clientY - rect.top

  // Convert to image pixels (unscaled coordinates)
  const x = screenX / scale
  const y = screenY / scale

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

  if (imageDataRef.hasValue) {
    buffer.set(imageDataRef.get()!)
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
  updateSize()
  updateView()
})

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
      cursor: 'crosshair'
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