import { makePixelCanvas, type PixelCanvas } from '../../../lib/util/html-dom/PixelCanvas.ts'
import type { EditorState } from '../EditorState.ts'
import { renderCanvasFrame } from '../lib/canvas-frame.ts'

export type TileSheetRenderer = ReturnType<typeof makeTileSheetRenderer>

export function makeTileSheetRenderer(
  {
    state,
  }: {
    state: EditorState,
  }) {

  let tileGridPixelCanvas: PixelCanvas | undefined

  function setTileSheetCanvas(canvas: HTMLCanvasElement) {
    tileGridPixelCanvas = makePixelCanvas(canvas)
    resize()
  }

  function resize() {
    if (!tileGridPixelCanvas) return
    tileGridPixelCanvas.resize(
      state.tileSheet.pixelWidth * state.scale,
      state.tileSheet.pixelHeight * state.scale,
    )
  }

  function draw() {

    const drawPixelLayer = (ctx: CanvasRenderingContext2D) => {
      state.tileSheet.each((tileX, tileY, tile) => {
        const x = tileX * state.tileSize
        const y = tileY * state.tileSize
        drawText(ctx, tile.index + '', x + 5, y + 15)
        state.tileGridManager.tileGridEdgeColorRenderer.drawTileEdges(ctx, tile.id, x, y)
      })
    }

    renderCanvasFrame(
      tileGridPixelCanvas,
      state.scale,
      () => state.tileSheet.imageData,
      drawPixelLayer,
    )
  }

  return {
    state,
    draw,
    setTileSheetCanvas,
    resize,
  }
}

function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  ctx.font = '8px sans-serif' // e.g., "bold italic 40px Arial"
  // ctx.fillStyle = 'red' // Color for filled text
  ctx.strokeStyle = 'black' // Color for outlined text
  ctx.lineWidth = 1 // Width of the outline

  ctx.fillStyle = '#00ff00'

  ctx.strokeText(text, x, y)
  ctx.fillText(text, x, y)
}
