import { getCanvasPixelContext } from '../../lib/util/misc.ts'
import type { TileId } from '../../lib/wang-tiles/WangTileset.ts'
import type { LocalToolContext } from './_canvas-editor-types.ts'
import type { TileGrid } from './data/TileGrid.ts'
import type { EditorState } from './EditorState.ts'
import type { GlobalToolManager } from './GlobalToolManager.ts'
import { renderCanvasFrame } from './lib/canvas-frame.ts'
import type { PixelGridCache } from './lib/PixelGridCache.ts'

export type TileRenderer = ReturnType<typeof makeTileRenderer>

export function makeTileRenderer(
  {
    tileId,
    state,
    getTileImageData,
    gridCache,
    tileCanvas,
    tileGrid,
    globalToolManager,
    localToolContext,
  }: {
    tileId: TileId,
    state: EditorState,
    getTileImageData: () => ImageData,
    gridCache: PixelGridCache,
    tileCanvas: HTMLCanvasElement,
    tileGrid: TileGrid,
    globalToolManager: GlobalToolManager,
    localToolContext: () => LocalToolContext


  }) {

  let ctx = getCanvasPixelContext(tileCanvas)

  const pixelCanvas = { canvas: tileCanvas, ctx }
  let needsRender = false

  function resize() {
    if (!tileCanvas) return
    tileCanvas.width = state.scaledTileSize
    tileCanvas.height = state.scaledTileSize
    ctx!.imageSmoothingEnabled = false
  }

  function queueRender() {
    if (needsRender) return
    needsRender = true

    requestAnimationFrame(() => {
      needsRender = false
      renderFrame()
    })
  }

  function renderFrame() {
    renderCanvasFrame(
      pixelCanvas,
      state.scale,
      getTileImageData,
      (ctx) => {
        tileGrid.drawTileEdges(ctx, tileId)
        globalToolManager.currentToolHandler.tilePixelOverlayDraw?.(localToolContext(), ctx, tileId)
      },
      (ctx) => {
        gridCache.drawGrid(ctx)
        globalToolManager.currentToolHandler.tileScreenOverlayDraw?.(localToolContext(), ctx, tileId)
      },
    )
  }

  return {
    tileId,
    canvas: pixelCanvas.canvas,
    ctx,
    resize,
    queueRender,
  }
}
