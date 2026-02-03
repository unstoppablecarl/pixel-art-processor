import { putImageDataScaled } from '../../../../lib/util/html-dom/ImageData.ts'
import { drawText, makePixelCanvas, type PixelCanvas } from '../../../../lib/util/html-dom/PixelCanvas.ts'
import { Tool } from '../../_core-editor-types.ts'
import { type LocalToolStates } from '../_tile-grid-editor-types.ts'
import type { TileGridEditorState } from '../TileGridEditorState.ts'
import { renderCanvasFrame } from '../../../../lib/util/html-dom/renderCanvasFrame.ts'
import type { SelectionTileSheetRect } from '../lib/TileSheetSelection.ts'
import type { PixelGridLineRenderer } from '../../_support/PixelGridLineRenderer.ts'

export type TileSheetRenderer = ReturnType<typeof makeTileSheetRenderer>

export function makeTileSheetRenderer(
  {
    state,
    gridCache,
    localToolStates,
  }: {
    state: TileGridEditorState,
    localToolStates: LocalToolStates,
    gridCache: PixelGridLineRenderer,

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

    const toolState = localToolStates[Tool.SELECT]
    const drawPixelLayer = (ctx: CanvasRenderingContext2D) => {
      const { tileSize } = state

      state.tileSheet.each((tileX, tileY, tile) => {
        const x = tileX * tileSize
        const y = tileY * tileSize
        state.tileGridManager.tileGridEdgeColorRenderer.drawTileEdges(ctx, tile.id, x, y)
      })

      if (toolState.selection) {
        toolState.selection.originalRects.forEach((r) => {
          drawRect(ctx, r, 'rgba(255, 0, 0, 0.25)')
        })

        const pixels = toolState.selection.pixels
        toolState.selection.currentRects.forEach((r) => {
          drawRect(ctx, r, 'rgba(0, 255, 0, 0.25)')

          const srcX = r.bufferX
          const srcY = r.bufferY

          putImageDataScaled(ctx, pixels, r.x, r.y, undefined, srcX, srcY, r.w, r.h)
        })
      }
    }

    const drawScreenLayer = (ctx: CanvasRenderingContext2D) => {

      const { scale, tileSize } = state
      gridCache.draw(ctx)
      if (state.drawTileIds) {
        state.tileSheet.each((tileX, tileY, tile) => {
          const x = tileX * tileSize * scale
          const y = tileY * tileSize * scale
          drawText(ctx, tile.index + ': ' + tile.id, x, y)
        })
      }

      if (toolState.selection) {
        toolState.selection.originalRects.forEach((r, i) => {
          drawRectOutline(ctx, r, scale, 'rgba(255, 0, 0, 0.75)', i)
        })

        toolState.selection.currentRects.forEach((r, i) => {
          drawRectOutline(ctx, r, scale, 'rgba(0, 255, 0, 0.75)', i)
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

function drawRect(ctx: CanvasRenderingContext2D, r: SelectionTileSheetRect, color: string) {
  const { x, y, w, h } = r
  ctx.globalAlpha = 1
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
}

function drawRectOutline(ctx: CanvasRenderingContext2D, r: SelectionTileSheetRect, scale: number, color: string, i: number) {
  let { x, y, w, h } = r

  const screenX = x * scale - 1.5
  const screenY = y * scale - 1.5
  const screenW = w * scale + 4
  const screenH = h * scale + 4

  ctx.strokeStyle = color
  ctx.lineWidth = 1
  ctx.strokeRect(screenX, screenY, screenW, screenH)
  drawText(
    ctx,
    i + '',
    screenX + 2 * scale,
    screenY + 2 * scale,
    undefined,
    undefined,
    'white',
  )
}