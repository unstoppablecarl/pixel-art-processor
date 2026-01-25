import { getCanvasPixelContext } from '../../lib/util/misc.ts'
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

  let ctx = getCanvasPixelContext(tileCanvas)

  const pixelCanvas = { canvas: tileCanvas, ctx }

  function resize() {
    if (!tileCanvas) return
    tileCanvas.width = state.scaledTileSize
    tileCanvas.height = state.scaledTileSize
    ctx!.imageSmoothingEnabled = false
  }

  const queueRender = makeRenderQueue(() => {
    renderCanvasFrame(
      pixelCanvas,
      state.scale,
      getTileImageData,
      (ctx) => {
        state.tileGrid.tileGridEdgeColorRenderer.drawTileEdges(ctx, tileId)
        globalToolManager.currentToolHandler.tilePixelOverlayDraw?.(localToolContext(), ctx, tileId)
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
    ctx,
    resize,
    queueRender,
  }
}
