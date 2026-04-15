import { makeCanvasFrameRenderer } from 'pixel-data-js'
import { watch } from 'vue'
import { drawText, makePixelCanvas, type PixelCanvas } from '../../../lib/util/html-dom/PixelCanvas.ts'
import type { PixelGridLineRenderer } from '../../_core/renderers/PixelGridLineRenderer.ts'
import type { TileGridEditorState } from '../TileGridEditorState.ts'
import type { TileGridToolset } from '../TileGridToolset.ts'
import { drawDebugRect, drawDebugRectOutline } from './_debug-draw-helpers.ts'
import type { TileGridEdgeColorRenderer } from './TileGridEdgeColorRenderer.ts'

export type TileSheetRenderer = ReturnType<typeof makeTileSheetRenderer>

export function makeTileSheetRenderer(
  {
    state,
    gridCache,
    toolset,
    tileGridEdgeColorRenderer,
  }: {
    state: TileGridEditorState,
    toolset: TileGridToolset
    gridCache: PixelGridLineRenderer,
    tileGridEdgeColorRenderer: TileGridEdgeColorRenderer,
  }) {

  const renderCanvasFrame = makeCanvasFrameRenderer()
  let tileGridPixelCanvas: PixelCanvas | undefined

  function setTileSheetCanvas(canvas: HTMLCanvasElement) {
    tileGridPixelCanvas = makePixelCanvas(canvas)
    resize()
  }

  function resize() {
    if (!tileGridPixelCanvas) return
    const scale = state.reactive.scale.value
    const target = state.tileSheet.pixelData

    tileGridPixelCanvas.resize(
      target.w * scale,
      target.h * scale,
    )
  }

  function draw() {
    const toolState = toolset.toolHandlers.SELECT.toolState

    const drawPixelLayer = (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) => {
      const { tileSize } = state

      if (state.reactive.showTileEdgeColors.value) {

        // base tilesheet debug: tile edges
        state.tileSheet.each((tileX, tileY, tile) => {
          const x = tileX * tileSize
          const y = tileY * tileSize
          tileGridEdgeColorRenderer.drawTileEdges(ctx, tile.id, x, y)
        })
      }

      const sel = toolState.selection
      if (!sel) return

      // use real sheet footprint, not buffer rects
      const original = sel.getOriginalSheetDrawRects()
      const current = sel.getCurrentSheetDrawRects()

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

    const drawScreenLayer = (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) => {
      const sel = toolState.selection
      const { scale, tileSize } = state

      if (state.shouldDrawGrid()) {
        gridCache.draw(ctx)
      }

      if (state.reactive.showTileEdgeColors.value) {
        state.tileSheet.each((tileX, tileY, tile) => {
          const x = tileX * tileSize * scale
          const y = tileY * tileSize * scale
          drawText(ctx, tile.id + '', x, y)
        })
      }

      if (sel) {
        const original = sel.getOriginalSheetDrawRects()
        const current = sel.getCurrentSheetDrawRects()

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
      () => state.tileSheet.pixelData.imageData,
      drawPixelLayer,
      drawScreenLayer,
    )
  }

  watch([
    state.reactive.tileSheet,
    state.reactive.tileSize,
    state.reactive.scale,
    state.reactive.showTileIds,
    state.reactive.showTileEdgeColors,
    state.reactive.showTileEdgeColorsOpacity,
    gridCache.watchTarget,
  ], () => {
    resize()

  })

  return {
    state,
    draw,
    setTileSheetCanvas,
    resize,
  }
}