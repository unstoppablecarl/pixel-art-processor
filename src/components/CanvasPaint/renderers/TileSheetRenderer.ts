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
        tilesetToolState.selection.originalRects.forEach((r) => {
          const { x, y, w, h } = r
          ctx.globalAlpha = 1
          ctx.fillStyle = 'rgba(255, 0,0,0.5)'
          ctx.fillRect(x, y, w, h)
        })
      }

      if (tilesetToolState.selection) {
        // tilesetToolState.renderCommitPreview(ctx)
        // tilesetToolState.selection.currentRects.forEach((r) => {
        //   const { x, y, w, h } = r
        //   const screenX = x + 1
        //   const screenY = y + 1
        //   const screenW = w - 2
        //   const screenH = h - 2
        //
        //   ctx.fillStyle = 'rgba(0, 255,0,0.5)'
        //   ctx.lineWidth = 1
        //
        //   ctx.fillRect(screenX, screenY, screenW, screenH)
        // })
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
        tilesetToolState.selection.originalRects.forEach((r, i) => {
          let { x, y, w, h } = r

          const screenX = x * scale - 1
          const screenY = y * scale - 1
          const screenW = w * scale + 2
          const screenH = h * scale + 2

          // const color = 'rgba(255, 0, 0 , 1)'
          const color = '#ff0000'
          ctx.globalAlpha = 1
          ctx.strokeStyle = color
          ctx.lineWidth = 1
          ctx.strokeRect(screenX - 0.5, screenY - 0.5, screenW + 2, screenH + 2)
          drawText(ctx, i + '', screenX + 5, screenY + 5, undefined, undefined, color)
        })

        // const { rects } = tilesetToolState.computeCommitRects()
        // rects.forEach((r, i) => {
        //
        //   ctx.strokeStyle = 'lime'
        //   ctx.lineWidth = 1
        //
        //   ctx.strokeRect(
        //     r.x * scale + 0.5,
        //     r.y * scale + 0.5,
        //     r.w * scale - 1,
        //     r.h * scale - 1,
        //   )
        //
        //   drawText(ctx, i + '', screenX, screenY, undefined, undefined, 'lime')
        // })
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

