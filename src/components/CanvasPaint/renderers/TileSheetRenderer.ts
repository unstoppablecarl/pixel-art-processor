import { drawText, makePixelCanvas, type PixelCanvas } from '../../../lib/util/html-dom/PixelCanvas.ts'
import type { EditorState } from '../EditorState.ts'
import { renderCanvasFrame } from '../lib/canvas-frame.ts'
import type { TilesetToolState } from '../TilesetToolState.ts'

export type TileSheetRenderer = ReturnType<typeof makeTileSheetRenderer>

export function makeTileSheetRenderer(
  {
    state,
    tilesetToolState,
  }: {
    state: EditorState,
    tilesetToolState: TilesetToolState
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
      const { tileSize } = state

      state.tileSheet.each((tileX, tileY, tile) => {
        const x = tileX * tileSize
        const y = tileY * tileSize
        state.tileGridManager.tileGridEdgeColorRenderer.drawTileEdges(ctx, tile.id, x, y)
      })

      if (tilesetToolState.selection) {
        tilesetToolState.selection.currentRects.forEach((r) => {
          const { x, y, w, h } = r
          const screenX = x + 1
          const screenY = y + 1
          const screenW = w - 2
          const screenH = h - 2

          ctx.fillStyle = 'rgba(255, 0,0,0.5)'
          ctx.lineWidth = 1

          ctx.fillRect(screenX, screenY, screenW, screenH)
        })
      }
    }

    const drawScreenLayer = (ctx: CanvasRenderingContext2D) => {

      const { scale, tileSize } = state

      if (state.drawTileIndexes) {
        state.tileSheet.each((tileX, tileY, tile) => {
          const x = tileX * tileSize * scale
          const y = tileY * tileSize * scale
          drawText(ctx, tile.index + ': ' + tile.id, x, y)
        })
      }

      if (tilesetToolState.selection) {
        tilesetToolState.selection.currentRects.forEach((r) => {
          let { x, y, w, h } = r

          const screenX = x * scale - 0.5
          const screenY = y * scale - 0.5
          const screenW = w * scale + 1
          const screenH = h * scale + 1

          ctx.strokeStyle = 'cyan'
          ctx.lineWidth = 1

          ctx.strokeRect(screenX, screenY, screenW, screenH)
        })
      }
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

