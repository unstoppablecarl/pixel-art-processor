import { type Ref, ref, watchEffect } from 'vue'
import { makePixelCanvas } from '../../../lib/util/html-dom/PixelCanvas.ts'

export type PixelGridLineRenderer = ReturnType<typeof makePixelGridLineRenderer>

export type GridLineSettings = {
  color: Ref<string>,
  width: Ref<number>,
  height: Ref<number>,
  scale: Ref<number>,
}

export type GridLineSettingsRaw = {
  color: string,
  width: number,
  height: number,
  scale: number,
}

export function makePixelGridLineRenderer(state: GridLineSettings) {
  const { canvas, ctx } = makePixelCanvas()
  const watchTarget = ref(0)
  let current: GridLineSettingsRaw | undefined

  watchEffect(() => {
    update({
      color: state.color.value,
      width: state.width.value,
      height: state.height.value,
      scale: state.scale.value,
    })
  })
  function changed(settings: GridLineSettingsRaw): boolean {
    if (!current) return true
    return (current.scale !== settings.scale ||
      current.width !== settings.width ||
      current.height !== settings.height ||
      current.color !== settings.color)
  }

  function update(newState: GridLineSettingsRaw) {
    const { scale, width, height, color } = newState
    if (!changed({ scale, width, height, color })) {
      return
    }

    const screenWidth = width * scale
    const screenHeight = height * scale

    // Resize if needed
    if (canvas.width !== screenWidth || canvas.height !== screenHeight) {
      canvas.width = screenWidth
      canvas.height = screenHeight
    }
    ctx.imageSmoothingEnabled = false
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.translate(0.5, 0.5)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = color
    ctx.lineWidth = 1

    // Draw vertical lines
    for (let x = 0; x <= width; x++) {
      const screenX = x * scale
      ctx.beginPath()
      ctx.moveTo(screenX, 0)
      ctx.lineTo(screenX, screenHeight)
      ctx.stroke()
    }

    // Draw horizontal lines
    for (let y = 0; y <= height; y++) {
      const screenY = y * scale
      ctx.beginPath()
      ctx.moveTo(0, screenY)
      ctx.lineTo(screenWidth, screenY)
      ctx.stroke()
    }
    watchTarget.value++
  }

  function draw(ctx: CanvasRenderingContext2D) {
    ctx.drawImage(canvas, 0, 0)
  }

  return {
    update,
    draw,
    watchTarget,
  }
}