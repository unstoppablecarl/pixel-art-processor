import { makePixelCanvas } from '../../lib/util/html-dom/PixelCanvas.ts'
import type { TileId } from '../../lib/wang-tiles/WangTileset.ts'
import type { LocalToolContext } from './_canvas-editor-types.ts'
import type { EditorState } from './EditorState.ts'
import type { GlobalToolManager } from './GlobalToolManager.ts'
import { makeRenderQueue, renderCanvasFrame } from './lib/canvas-frame.ts'
import type { PixelGridLineRenderer } from './renderers/PixelGridLineRenderer.ts'

export type TileRenderer = ReturnType<typeof makeTileRenderer>

export function makeTileRenderer(
  {
    tileId,
    state,
    getTileImageData,
    gridCache,
    tileCanvas,
    globalToolManager,
    localToolContext,
  }: {
    tileId: TileId,
    state: EditorState,
    getTileImageData: () => ImageData,
    gridCache: PixelGridLineRenderer,
    tileCanvas: HTMLCanvasElement,
    globalToolManager: GlobalToolManager,
    localToolContext: () => LocalToolContext

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
        globalToolManager.currentToolHandler.tilePixelOverlayDraw?.(localToolContext(), ctx, tileId)
        state.tileGridManager.tileGridEdgeColorRenderer.drawTileEdges(ctx, tileId)
      },
      (ctx) => {
        if (state.shouldDrawGrid) {
          gridCache.drawGrid(ctx)
        }

        globalToolManager.currentToolHandler.tileScreenOverlayDraw?.(localToolContext(), ctx, tileId)
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
