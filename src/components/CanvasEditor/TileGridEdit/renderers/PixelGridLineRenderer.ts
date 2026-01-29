import type { TileGridEditorState } from '../TileGridEditorState.ts'

export type PixelGridLineRenderer = ReturnType<typeof makePixelGridLineRenderer>

export type GridCacheUpdate = {
  gridColor: string,
  width: number,
  height: number,
  scale: number,
  scaledWidth: number,
  scaledHeight: number,
}

export function makePixelGridLineRenderer(state: TileGridEditorState) {
  const gridCache = document.createElement('canvas')
  const gridCacheCtx = gridCache.getContext('2d')!

  function updateGridCache() {
    const ctx = gridCacheCtx

    const {
      gridColor,
      gridPixelWidth,
      gridPixelHeight,
      scale,
      gridScreenWidth,
      gridScreenHeight,
    } = state

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    // Resize if needed
    if (gridCache.width !== gridScreenWidth || gridCache.height !== gridScreenHeight) {
      gridCache.width = gridScreenWidth
      gridCache.height = gridScreenHeight
    }
    ctx.translate(0.5, 0.5)
    ctx.clearRect(0, 0, gridCache.width, gridCache.height)
    ctx.strokeStyle = gridColor
    ctx.lineWidth = 1

    // Draw vertical lines
    for (let x = 0; x <= gridPixelWidth; x++) {
      const screenX = x * scale
      ctx.beginPath()
      ctx.moveTo(screenX, 0)
      ctx.lineTo(screenX, gridScreenHeight)
      ctx.stroke()
    }

    // Draw horizontal lines
    for (let y = 0; y <= gridPixelHeight; y++) {
      const screenY = y * scale
      ctx.beginPath()
      ctx.moveTo(0, screenY)
      ctx.lineTo(gridScreenWidth, screenY)
      ctx.stroke()
    }
  }

  function drawGrid(ctx: CanvasRenderingContext2D) {
    ctx.drawImage(gridCache, 0, 0)
  }

  return {
    updateGridCache,
    drawGrid,
  }
}