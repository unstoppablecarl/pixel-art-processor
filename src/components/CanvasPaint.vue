<script setup lang="ts">
import { onMounted, ref, Ref, watch } from 'vue'
import type { Position } from '../lib/pipeline/_types.ts'
import { drawPixelPerfectCircle, drawPixelPerfectSquare, interpolateLine } from '../lib/util/canvas/canvas-paint.ts'

const {
  width = 64,
  height = 64,
  bgColor = 'rgba(0,0,0,0)',
  color = '#000',
  cursorColor = '#fff',
  gridColor = 'rgba(0, 0, 0, 0.2)',
  brushShape = 'circle',
  brushSize = 10,
  scale = 1,
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
}>()

const offset = defineModel<Position>('offset', { default: { x: 0, y: 0 } })
const imageData = defineModel<ImageData | null>('imageData', { required: true })

const canvasRef: Ref<HTMLCanvasElement | null> = ref(null)
const viewCanvasRef: Ref<HTMLCanvasElement | null> = ref(null)

const isDrawing: Ref<boolean> = ref(false)
const isPanning: Ref<boolean> = ref(false)
const lastPos: Ref<Position> = ref({ x: 0, y: 0 })
const cursorPos: Ref<Position | null> = ref(null)

let throttleTimer: ReturnType<typeof setTimeout> | null = null

const canvasFromRef = (canvas: HTMLCanvasElement | null) => {
  if (!canvas) return { canvas, ctx: null }

  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return { canvas, ctx }

  ctx.imageSmoothingEnabled = false

  return { canvas, ctx }
}

const getCanvas = () => canvasFromRef(canvasRef.value)
const getViewCanvas = () => canvasFromRef(viewCanvasRef.value)

const updateImageData = (): void => {
  if (throttleTimer) return

  throttleTimer = setTimeout(() => {
    const { canvas, ctx } = getCanvas()
    if (!canvas) return
    if (!ctx) return

    imageData.value = ctx.getImageData(0, 0, canvas.width, canvas.height)
    throttleTimer = null
  }, 100)
}

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
const updateView = (): void => {
  const canvas = canvasRef.value
  const viewCanvas = viewCanvasRef.value
  if (!canvas || !viewCanvas) return

  const { ctx } = getViewCanvas()
  if (!ctx) return

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, viewCanvas.width, viewCanvas.height)
  ctx.translate(offset.value.x, offset.value.y)
  ctx.scale(scale, scale)
  ctx.drawImage(canvas, 0, 0)

  // Add after drawing the canvas in updateView(), but BEFORE applying transforms
  // Reset transform to draw grid in screen space
  ctx.setTransform(1, 0, 0, 1, 0, 0)

  if (scale >= 4) { // Only show grid when zoomed in enough
    ctx.strokeStyle = gridColor
    ctx.lineWidth = 1

    const startX = Math.floor(-offset.value.x)
    const startY = Math.floor(-offset.value.y)
    const endX = Math.ceil((viewCanvas.width / scale) - offset.value.x)
    const endY = Math.ceil((viewCanvas.height / scale) - offset.value.y)

    // Draw vertical lines
    for (let x = startX; x <= endX; x++) {
      const screenX = (x + offset.value.x) * scale
      ctx.beginPath()
      ctx.moveTo(screenX, 0)
      ctx.lineTo(screenX, viewCanvas.height)
      ctx.stroke()
    }

    // Draw horizontal lines
    for (let y = startY; y <= endY; y++) {
      const screenY = (y + offset.value.y) * scale
      ctx.beginPath()
      ctx.moveTo(0, screenY)
      ctx.lineTo(viewCanvas.width, screenY)
      ctx.stroke()
    }
  }

  // Then re-apply transforms for cursor drawing
  ctx.translate(offset.value.x * scale, offset.value.y * scale)
  ctx.scale(scale, scale)

  // Draw cursor preview
  if (cursorPos.value && !isPanning.value) {
    // Reset transform to draw in screen space
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
}
const getCanvasCoords = (e: MouseEvent): Position => {
  const viewCanvas = viewCanvasRef.value
  if (!viewCanvas) return { x: 0, y: 0 }

  const rect = viewCanvas.getBoundingClientRect()
  const x = (e.clientX - rect.left) / scale - offset.value.x
  const y = (e.clientY - rect.top) / scale - offset.value.y

  return { x, y }
}

const draw = (x: number, y: number): void => {
  const { ctx } = getCanvas()
  if (!ctx) return

  if (brushShape === 'circle') {
    drawPixelPerfectCircle(ctx, x, y, brushSize / 2, color)
  } else {
    drawPixelPerfectSquare(ctx, x, y, brushSize, color)
  }

  updateView()
  updateImageData()
}

const handleMouseDown = (e: MouseEvent): void => {
  if (e.shiftKey) {
    isPanning.value = true
    lastPos.value = { x: e.clientX, y: e.clientY }
  } else {
    isDrawing.value = true
    const { x, y } = getCanvasCoords(e)
    draw(x, y)
    lastPos.value = { x, y }
  }
}
const handleMouseMove = (e: MouseEvent): void => {
  const { x, y } = getCanvasCoords(e)
  cursorPos.value = { x, y }

  if (isPanning.value) {
    const dx = (e.clientX - lastPos.value.x) / scale
    const dy = (e.clientY - lastPos.value.y) / scale
    offset.value = {
      x: offset.value.x + dx,
      y: offset.value.y + dy,
    }
    lastPos.value = { x: e.clientX, y: e.clientY }
  } else if (isDrawing.value) {
    const { ctx } = getCanvas()
    if (!ctx) return

    // Interpolate between last position and current position
    const points = interpolateLine(
      Math.floor(lastPos.value.x),
      Math.floor(lastPos.value.y),
      Math.floor(x),
      Math.floor(y),
    )

    for (const point of points) {
      if (brushShape === 'circle') {
        drawPixelPerfectCircle(ctx, point.x, point.y, brushSize / 2, color)
      } else {
        drawPixelPerfectSquare(ctx, point.x, point.y, brushSize, color)
      }
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
  isPanning.value = false
}

const handleMouseLeave = (): void => {
  isDrawing.value = false
  isPanning.value = false
  cursorPos.value = null
  updateView()
}

function fillCanvas(color: string): void {
  const { canvas, ctx } = getCanvas()
  if (!ctx || !canvas) return

  ctx.fillStyle = color
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  updateView()
  updateImageData()
}

function clearCanvas(): void {
  const { canvas, ctx } = getCanvas()
  if (!ctx || !canvas) return
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
  if (imageData.value) {
    const { canvas, ctx } = getCanvas()
    if (!ctx || !canvas) return
    ctx.putImageData(imageData.value, 0, 0)
    updateView()
    updateImageData()
    // trigger re-paint
    requestAnimationFrame(() => {
      updateView()
    })
  } else {
    fillCanvas(bgColor)
  }
})

watch([
  offset,
  () => gridColor,
  () => cursorColor,
], () => {
  updateView()
}, { deep: true })

watch([
    () => width,
    () => height,
    () => scale,
  ],
  () => {
    const { canvas } = getCanvas()
    if (!canvas) return

    if (updateSize()) {
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
    style="cursor: crosshair;"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseLeave"
  ></canvas>

  <canvas
    ref="canvasRef"
    class="draw-canvas d-none"
    :width="width"
    :height="height"
  ></canvas>
</template>
<style>
.draw-canvas {
  image-rendering: pixelated;
}
</style>