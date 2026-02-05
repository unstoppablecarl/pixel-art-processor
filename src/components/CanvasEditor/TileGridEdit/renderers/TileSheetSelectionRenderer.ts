import { putImageData } from '../../../../lib/util/html-dom/ImageData.ts'
import { makePixelCanvas, type PixelCanvas } from '../../../../lib/util/html-dom/PixelCanvas.ts'
import { makeCanvasFrameRenderer } from '../../../../lib/util/html-dom/renderCanvasFrame.ts'
import { Tool } from '../../_core-editor-types.ts'
import type { PixelGridLineRenderer } from '../../_support/renderers/PixelGridLineRenderer.ts'
import { type LocalToolStates } from '../_tile-grid-editor-types.ts'
import type { TileGridEditorState } from '../TileGridEditorState.ts'
import { drawDebugRect, drawDebugRectOutline } from './_debug-draw-helpers.ts'

export type TileSheetSelectionRenderer = ReturnType<typeof makeTileSheetSelectionRenderer>

export function makeTileSheetSelectionRenderer(
  {
    state,
    gridCache,
    localToolStates,
  }: {
    state: TileGridEditorState,
    localToolStates: LocalToolStates,
    gridCache: PixelGridLineRenderer,
  }) {

  const renderCanvasFrame = makeCanvasFrameRenderer()
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
        (toolState.selection.pixels.width + 100) * state.scale,
        (toolState.selection.pixels.height + 100) * state.scale,
      )
    }
  }

  function draw() {
    const toolState = localToolStates[Tool.SELECT]

    const drawPixelLayer = (ctx: CanvasRenderingContext2D) => {
      const sel = toolState.selection
      if (!sel) return

      const sheetRects = sel.getCurrentTileAlignedRects()
      const pixels = sel.pixels

      for (const r of sheetRects) {
        // buffer-local rects
        const dx = r.bufferX
        const dy = r.bufferY

        drawDebugRect(ctx, { x: dx, y: dy, w: r.w, h: r.h }, 'rgba(0, 255, 0, 0.25)')

        putImageData(ctx, pixels, {
          dx,
          dy,
          sx: r.bufferX,
          sy: r.bufferY,
          sw: r.w,
          sh: r.h,
        })
      }
    }

    const drawScreenLayer = (ctx: CanvasRenderingContext2D) => {
      const sel = toolState.selection
      const { scale } = state

      gridCache.draw(ctx)

      if (sel) {
        const sheetRects = sel.getCurrentTileAlignedRects()

        ctx.translate(scale, scale)
        sheetRects.forEach((r, i) => {
          const dx = r.bufferX
          const dy = r.bufferY
          drawDebugRectOutline(
            ctx,
            { x: dx, y: dy, w: r.w, h: r.h },
            scale,
            'rgba(0, 255, 0, 0.75)',
            i,
          )
        })
        ctx.translate(0, 0)
      }
    }

    renderCanvasFrame(
      tileGridPixelCanvas!,
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