import { drawText, makePixelCanvas, type PixelCanvas } from '../../../../lib/util/html-dom/PixelCanvas.ts'
import { makeCanvasFrameRenderer } from '../../../../lib/util/html-dom/renderCanvasFrame.ts'
import { Tool } from '../../_core-editor-types.ts'
import type { PixelGridLineRenderer } from '../../_support/renderers/PixelGridLineRenderer.ts'
import { type LocalToolStates } from '../_tile-grid-editor-types.ts'
import type { TileGridEditorState } from '../TileGridEditorState.ts'
import { drawDebugRect, drawDebugRectOutline } from './_debug-draw-helpers.ts'
import type { TileGridEdgeColorRenderer } from './TileGridEdgeColorRenderer.ts'

export type TileSheetRenderer = ReturnType<typeof makeTileSheetRenderer>

export function makeTileSheetRenderer(
  {
    state,
    gridCache,
    localToolStates,
    tileGridEdgeColorRenderer,
  }: {
    state: TileGridEditorState,
    localToolStates: LocalToolStates,
    gridCache: PixelGridLineRenderer,
    tileGridEdgeColorRenderer: TileGridEdgeColorRenderer
  }) {

  const renderCanvasFrame = makeCanvasFrameRenderer()
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

      // base tilesheet debug: tile edges
      state.tileSheet.each((tileX, tileY, tile) => {
        const x = tileX * tileSize
        const y = tileY * tileSize
        tileGridEdgeColorRenderer.drawTileEdges(ctx, tile.id, x, y)
      })

      const sel = toolState.selection
      if (!sel) return

      // use real sheet footprint, not buffer rects
      const original = sel.getOriginalDrawRectsForSheet()
      const current = sel.getCurrentDrawRectsForSheet()

      original.forEach(r => {
        drawDebugRect(ctx, { x: r.dx, y: r.dy, w: r.w, h: r.h }, 'rgba(255, 0, 0, 0.25)')

        // ctx.globalAlpha = 0.5
        // ctx.putImageData(sel.pixels, r.dx - r.sx, r.dy - r.sy, r.sx, r.sy, r.w, r.h)
        // ctx.globalAlpha = 1
      })

      current.forEach(r => {
        drawDebugRect(ctx, { x: r.dx, y: r.dy, w: r.w, h: r.h }, 'rgba(0, 255, 0, 0.25)')
      })
    }

    const drawScreenLayer = (ctx: CanvasRenderingContext2D) => {
      const sel = toolState.selection
      const { scale, tileSize } = state

      if (state.shouldDrawGrid()) {
        gridCache.draw(ctx)
      }

      if (state.drawTileIds) {
        state.tileSheet.each((tileX, tileY, tile) => {
          const x = tileX * tileSize * scale
          const y = tileY * tileSize * scale
          drawText(ctx, tile.index + '', x, y)
        })
      }

      if (sel) {
        const original = sel.getOriginalDrawRectsForSheet()
        const current = sel.getCurrentDrawRectsForSheet()

        original.forEach((r, i) => {
          drawDebugRectOutline(ctx, { x: r.dx, y: r.dy, w: r.w, h: r.h }, scale, 'rgba(255, 0, 0, 0.75)', i)
        })

        current.forEach((r, i) => {
          drawDebugRectOutline(ctx, { x: r.dx, y: r.dy, w: r.w, h: r.h }, scale, 'rgba(0, 255, 0, 0.75)', i)
        })
      }
    }

    renderCanvasFrame(
      tileGridPixelCanvas!,
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