import { drawText, makePixelCanvas } from '../../../../lib/util/html-dom/PixelCanvas.ts'
import type { TileId } from '../../../../lib/wang-tiles/WangTileset.ts'
import type { TileGridEditorState } from '../TileGridEditorState.ts'
import { makeRenderQueue, renderCanvasFrame } from '../lib/canvas-frame.ts'
import type { CurrentToolRenderer } from './CurrentToolRenderer.ts'
import type { PixelGridLineRenderer } from './PixelGridLineRenderer.ts'

export type TileRenderer = ReturnType<typeof makeTileRenderer>

export function makeTileRenderer(
  {
    tileId,
    state,
    getTileImageData,
    gridCache,
    tileCanvas,
    currentToolRenderer,
  }: {
    tileId: TileId,
    state: TileGridEditorState,
    getTileImageData: () => ImageData,
    gridCache: PixelGridLineRenderer,
    tileCanvas: HTMLCanvasElement,
    currentToolRenderer: CurrentToolRenderer,
  }) {

  const pixelCanvas = makePixelCanvas(tileCanvas)

  function resize() {
    pixelCanvas.resize(state.scaledTileSize, state.scaledTileSize)
  }

  const queueRender = makeRenderQueue(() => {
    renderCanvasFrame(
      pixelCanvas,
      state.scale,
      getTileImageData,
      (ctx) => {
        currentToolRenderer.tilePixelOverlayDraw(ctx, tileId)
        state.tileGridManager.tileGridEdgeColorRenderer.drawTileEdges(ctx, tileId)
      },
      (ctx) => {
        if (state.shouldDrawGrid) {
          gridCache.drawGrid(ctx)
        }
        if (state.drawTileIds) {
          const tile = state.tileset.byId.get(tileId)!
          drawText(ctx, tile.index + ': ' + tile.id)
        }
        currentToolRenderer.tileScreenOverlayDraw(ctx, tileId)
      },
    )
  })

  return {
    tileId,
    canvas: pixelCanvas.canvas,
    resize,
    queueRender,
  }
}
