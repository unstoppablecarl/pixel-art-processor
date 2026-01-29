import type { RectBounds } from '../../../lib/util/data/Bounds.ts'
import { putImageDataScaled } from '../../../lib/util/html-dom/ImageData.ts'
import { drawText, makePixelCanvas, type PixelCanvas } from '../../../lib/util/html-dom/PixelCanvas.ts'
import { type LocalToolStates, Tool } from '../_canvas-editor-types.ts'
import type { EditorState } from '../EditorState.ts'
import { renderCanvasFrame } from '../lib/canvas-frame.ts'
import type { SelectionTileSheetRect } from '../lib/TileSheetSelection.ts'
import type { PixelGridLineRenderer } from './PixelGridLineRenderer.ts'

export type TileSheetSelectionRenderer = ReturnType<typeof makeTileSheetSelectionRenderer>

export function makeTileSheetSelectionRenderer(
  {
    state,
    gridCache,
    localToolStates,
  }: {
    state: EditorState,
    localToolStates: LocalToolStates,
    gridCache: PixelGridLineRenderer,
  }) {

  let tileGridPixelCanvas: PixelCanvas | undefined

  function setTileSheetCanvas(canvas: HTMLCanvasElement) {
    tileGridPixelCanvas = makePixelCanvas(canvas)
    resize()
  }

  function resize() {
    const toolState = localToolStates[Tool.SELECT]
    if (!tileGridPixelCanvas) return
    if (toolState.selection) {
      tileGridPixelCanvas.resize(
        (toolState.selection!.pixels.width + 100) * state.scale,
        (toolState.selection!.pixels.height + 100) * state.scale,
      )
    }
  }

  function draw() {
    const toolState = localToolStates[Tool.SELECT]
    const drawPixelLayer = (ctx: CanvasRenderingContext2D) => {

      if (toolState.selection) {
        const pixels = toolState.selection.pixels

        toolState.selection.currentRects.forEach((r) => {
          drawRect(ctx, r, 'rgba(0, 255, 0, 0.25)')

          putImageDataScaled(ctx, pixels, r.bufferX, r.bufferY, undefined, r.bufferX, r.bufferY, r.w, r.h)
        })
      }
    }

    const drawScreenLayer = (ctx: CanvasRenderingContext2D) => {

      const { scale } = state
      gridCache.drawGrid(ctx)

      if (toolState.selection) {

        ctx.translate(scale, scale)
        toolState.selection.currentRects.forEach((r, i) => {
          drawRectOutline(ctx, { x: r.bufferX, y: r.bufferY, w: r.w, h: r.h }, scale, 'rgba(0, 255, 0, 0.75)', i)
        })
        ctx.translate(0, 0)
      }
    }
    renderCanvasFrame(
      tileGridPixelCanvas,
      state.scale,
      () => null,
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

function drawRectOutline(ctx: CanvasRenderingContext2D, r: RectBounds, scale: number, color: string, i: number) {
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