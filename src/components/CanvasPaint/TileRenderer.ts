import { putImageDataScaled } from '../../lib/util/html-dom/ImageData.ts'
import { getCanvasPixelContext } from '../../lib/util/misc.ts'
import { type ImageDataRef } from '../../lib/vue/vue-image-data.ts'
import type { AxialEdgeWangTileManager } from '../../lib/wang-tiles/AxialEdgeWangTileManager.ts'
import type { TileId } from '../../lib/wang-tiles/WangTileset.ts'
import { type EditorState } from './EditorState.ts'
import type { PixelGridCache } from './lib/PixelGridCache.ts'

export type TileRenderer = ReturnType<typeof makeTileCanvasRenderer>

export function makeTileCanvasRenderer(
  tileId: TileId,
  state: EditorState,
  imageDataRef: ImageDataRef,
  gridCache: PixelGridCache,
  tileCanvas: HTMLCanvasElement,
  tilesetManager: AxialEdgeWangTileManager,
) {

  let ctx = getCanvasPixelContext(tileCanvas)

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

  function drawEdges(ctx: CanvasRenderingContext2D) {
    const imageData = tilesetManager.cachedWangTileEdgeColorImageData.value[tileId]

    ctx.globalAlpha = 0.5

    putImageDataScaled(ctx, state.tileSize, state.tileSize, imageData)
    // ctx.putImageData(imageData, 0, 0)
    ctx.globalAlpha = 1
  }

  function renderFrame() {
    if (!tileCanvas || !ctx) return

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, tileCanvas.width, tileCanvas.height)

    ctx.scale(state.scale, state.scale)

    const targetImageData = imageDataRef.get()
    if (targetImageData) {
      putImageDataScaled(ctx, targetImageData.width, targetImageData.height, targetImageData)
    }

    // const {} = tilesetManager.gridPixelToTile()
    // const {} = state.tilePixelToGridPixel()

    drawEdges(ctx)
    state.pixelOverlayDraw?.(ctx)

    ctx.setTransform(1, 0, 0, 1, 0, 0)

    gridCache.drawGrid(ctx)

    state?.screenOverlayDraw?.(ctx)
  }

  // function renderFrame() {
  //   const tileSize = state.tileSize
  //   const { gridX, gridY } = tilesetManager.tilePixelToGridPixel(tileX, tileY)
  //   ctx.drawImage(gridCanvas,
  //     gridX * state.scale,
  //     gridY * state.scale,
  //     tileSize * state.scale,
  //     tileSize * state.scale,
  //   )
  // }

  return {
    tileId,
    resize,
    queueRender,
  }
}
