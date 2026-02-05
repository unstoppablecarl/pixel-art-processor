import { drawText, makePixelCanvas } from '../../../../lib/util/html-dom/PixelCanvas.ts'
import { makeCanvasFrameRenderer, makeRenderQueue } from '../../../../lib/util/html-dom/renderCanvasFrame.ts'
import type { TileId } from '../../../../lib/wang-tiles/WangTileset.ts'
import type { PixelGridLineRenderer } from '../../_support/renderers/PixelGridLineRenderer.ts'
import type { TileGridEditorState } from '../TileGridEditorState.ts'
import type { CurrentToolRenderer } from './CurrentToolRenderer.ts'
import type { TileGridEdgeColorRenderer } from './TileGridEdgeColorRenderer.ts'

export type TileRenderer = ReturnType<typeof makeTileRenderer>

export function makeTileRenderer(
  {
    tileId,
    state,
    getTileImageData,
    gridCache,
    tileCanvas,
    currentToolRenderer,
    tileGridEdgeColorRenderer,
  }: {
    tileId: TileId,
    state: TileGridEditorState,
    getTileImageData: () => ImageData,
    gridCache: PixelGridLineRenderer,
    tileCanvas: HTMLCanvasElement,
    currentToolRenderer: CurrentToolRenderer,
    tileGridEdgeColorRenderer: TileGridEdgeColorRenderer
  }) {
  const renderCanvasFrame = makeCanvasFrameRenderer()
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
        tileGridEdgeColorRenderer.drawTileEdges(ctx, tileId)
      },
      (ctx) => {
        if (state.shouldDrawGrid()) {
          gridCache.draw(ctx)
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
