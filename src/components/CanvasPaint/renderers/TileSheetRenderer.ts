import { drawText, makePixelCanvas, type PixelCanvas } from '../../../lib/util/html-dom/PixelCanvas.ts'
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
        state.tileGridManager.tileGridEdgeColorRenderer.drawTileEdges(ctx, tile.id, x, y)
      })
    }

    const drawScreenLayer = (ctx: CanvasRenderingContext2D) => {
      state.tileSheet.each((tileX, tileY, tile) => {
        const x = tileX * state.tileSize * state.scale
        const y = tileY * state.tileSize * state.scale
        drawText(ctx, tile.index + '', x, y)
      })
    }
    renderCanvasFrame(
      tileGridPixelCanvas,
      state.scale,
      () => state.tileSheet.imageData,
      drawPixelLayer,
      drawScreenLayer,
    )
  }

  return {
    state,
    draw,
    setTileSheetCanvas,
    resize,
  }
}

