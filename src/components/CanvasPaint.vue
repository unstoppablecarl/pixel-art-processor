<script setup lang="ts">
import { computed, onMounted, ref, Ref, useTemplateRef, watch } from 'vue'
import type { Position } from '../lib/pipeline/_types.ts'
import { parseColor } from '../lib/util/color.ts'
import { ImageDataMutator, interpolateLine } from '../lib/util/html-dom/ImageDataMutator.ts'
import { throttle } from '../lib/util/misc.ts'
import type { ImageDataRef } from '../lib/vue/vue-image-data.ts'
import RGBA = tinycolor.ColorFormats.RGBA

type DrawLayer = (ctx: CanvasRenderingContext2D, buffer: CustomBuffer) => void
type Emits = {
  (e: 'setPixel', x: number, y: number, color: RGBA): void;
}
const emit = defineEmits<Emits>()

class CustomBuffer extends ImageDataMutator {
  setPixel(x: number, y: number, color: RGBA) {
    // super.setPixel(x, y, color)
    emit('setPixel', x, y, color)
  }

  setPixelQuiet(x: number, y: number, color: RGBA) {
    super.setPixel(x, y, color)
  }
}

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
  drawLayerUnder = null,
  drawLayerOver = null,
  throttleMs = 0,
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
  drawLayerUnder?: DrawLayer | null
  drawLayerOver?: DrawLayer | null
}>()

const buffer = new CustomBuffer()

const viewCanvasRef = useTemplateRef<HTMLCanvasElement | null>('viewCanvasRef')

// Offscreen canvases for caching
let gridCache: HTMLCanvasElement | null = null
let cursorCache: HTMLCanvasElement | null = null

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
  // imageDataRef.set(buffer.imageData)
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

const initCaches = () => {
  // Create offscreen canvases
  gridCache = document.createElement('canvas')
  cursorCache = document.createElement('canvas')

  gridCache.width = scaledWidth.value
  gridCache.height = scaledHeight.value
  cursorCache.width = scaledWidth.value
  cursorCache.height = scaledHeight.value
}

const updateGridCache = () => {
  if (!gridCache) return

  const ctx = gridCache.getContext('2d')
  if (!ctx) return

  // Resize if needed
  if (gridCache.width !== scaledWidth.value || gridCache.height !== scaledHeight.value) {
    gridCache.width = scaledWidth.value
    gridCache.height = scaledHeight.value
  }

  ctx.clearRect(0, 0, gridCache.width, gridCache.height)
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
}

const updateCursorCache = () => {
  if (!cursorCache || !cursorPos.value) return

  const ctx = cursorCache.getContext('2d')
  if (!ctx) return

  // Resize if needed
  if (cursorCache.width !== scaledWidth.value || cursorCache.height !== scaledHeight.value) {
    cursorCache.width = scaledWidth.value
    cursorCache.height = scaledHeight.value
  }

  ctx.clearRect(0, 0, cursorCache.width, cursorCache.height)
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
}

const updateView = () => {
  const { ctx, canvas } = getViewCanvas()
  if (!ctx || !canvas) return

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Draw the image data scaled up
  ctx.scale(scale, scale)

  // Draw layers under
  drawLayerUnder?.(ctx, buffer)

  buffer.drawOnto(ctx)

  // Draw layers over
  drawLayerOver?.(ctx, buffer)

  // Reset transform for overlays
  ctx.setTransform(1, 0, 0, 1, 0, 0)

  // Blit cached grid (if scale is high enough)
  if (scale >= 4 && gridCache) {
    ctx.drawImage(gridCache, 0, 0)
  }

  // Blit cached cursor
  if (cursorCache && cursorPos.value) {
    ctx.drawImage(cursorCache, 0, 0)
  }
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
  const oldCursorPos = cursorPos.value
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

    updateImageData()
    lastPos.value = { x, y }
  }

  // Only update cursor cache if position changed
  if (!oldCursorPos ||
    Math.floor(oldCursorPos.x) !== Math.floor(x) ||
    Math.floor(oldCursorPos.y) !== Math.floor(y)) {
    updateCursorCache()
  }

  updateView()
}

const handleMouseUp = (): void => {
  isDrawing.value = false
}

const handleMouseLeave = (): void => {
  isDrawing.value = false
  cursorPos.value = null
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
  initCaches()
  updateSize()

  if (imageDataRef.hasValue) {
    buffer.set(imageDataRef.get()!)
  } else {
    buffer.set(new ImageData(width, height))
    buffer.clear()
  }

  updateGridCache()
  updateView()
})

watch([
  () => gridColor,
  () => scale,
  () => width,
  () => height,
], () => {
  updateSize()
  updateGridCache()
  updateCursorCache()
  updateView()
})

watch([
  () => brushSize,
  () => brushShape,
  () => cursorColor,
], () => {
  if (cursorPos.value) {
    updateCursorCache()
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