import { getCanvasPixelContext } from '../../lib/util/misc.ts'
import type { ImageDataRef } from '../../lib/vue/vue-image-data.ts'
import type { AxialEdgeWangTileManager } from '../../lib/wang-tiles/AxialEdgeWangTileManager.ts'
import type { TileId } from '../../lib/wang-tiles/WangTileset.ts'
import type { DrawLayer } from './_canvas-editor-types.ts'
import type { EditorState } from './EditorState.ts'
import { renderCanvasFrame } from './lib/canvas-frame.ts'
import type { PixelGridCache } from './lib/PixelGridCache.ts'

export type TileRenderer = ReturnType<typeof makeTileRenderer>

export function makeTileRenderer(
  {
    tileId,
    state,
    imageDataRef,
    gridCache,
    tileCanvas,
    tilesetManager,
    tilePixelOverlayDraw,
    tileScreenOverlayDraw,
  }: {
    tileId: TileId,
    state: EditorState,
    imageDataRef: ImageDataRef,
    gridCache: PixelGridCache,
    tileCanvas: HTMLCanvasElement,
    tilesetManager: AxialEdgeWangTileManager,
    tilePixelOverlayDraw?: DrawLayer,
    tileScreenOverlayDraw?: DrawLayer
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
      imageDataRef,
      (ctx) => {
        tilesetManager.drawTileEdges(ctx, tileId)
        tilePixelOverlayDraw?.(ctx)
      },
      (ctx) => {
        gridCache.drawGrid(ctx)
        tileScreenOverlayDraw?.(ctx)
      },
    )
  }

  return {
    tileId,
    resize,
    queueRender,
  }
}
