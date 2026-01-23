import { putImageDataScaled, writeImageData } from '../../lib/util/html-dom/ImageData.ts'
import { getCanvasPixelContext, type PixelCanvas } from '../../lib/util/misc.ts'
import { imageDataRef } from '../../lib/vue/vue-image-data.ts'
import type { AxialEdgeWangTileManager } from '../../lib/wang-tiles/AxialEdgeWangTileManager.ts'
import type { TileId } from '../../lib/wang-tiles/WangTileset.ts'
import { type EditorState } from './EditorState.ts'
import { type GlobalToolContext } from './GlobalToolManager.ts'
import { makePixelGridCache } from './lib/PixelGridCache.ts'
import { makeTileCanvasRenderer, type TileRenderer } from './TileRenderer.ts'
import { makeCursorCache } from './tools/brush-cursor.ts'

export type TileGridRenderer = ReturnType<typeof makeTileGridRenderer>

export function makeTileGridRenderer(
  state: EditorState,
  toolContext: GlobalToolContext,
  tilesetManager: AxialEdgeWangTileManager,
) {
  let needsRender = false

  let tileGridPixelCanvas: PixelCanvas | undefined

  const tileGridImageData = imageDataRef()
  const tileRenderers: Record<TileId, TileRenderer> = {}
  const gridCache = makePixelGridCache(state)

  function setTileGridCanvas(canvas: HTMLCanvasElement) {
    tileGridPixelCanvas = {
      canvas,
      ctx: getCanvasPixelContext(canvas),
    }
    resize()
    queueRender()
  }

  function registerTileCanvas(tileId: TileId, canvas: HTMLCanvasElement) {
    tileRenderers[tileId] = makeTileCanvasRenderer(
      tileId,
      state,
      state.tilesetImageRefs[tileId],
      gridCache,
      canvas,
      tilesetManager,
    )
    queueRenderTile(tileId)
  }

  function resize() {
    if (!tileGridPixelCanvas) return
    tileGridPixelCanvas.canvas.width = state.gridScreenWidth
    tileGridPixelCanvas.canvas.height = state.gridScreenHeight
    gridCache.updateGridCache()
    tileGridImageData.resize(state.gridScreenWidth, state.gridScreenHeight)

    for (const tileRenderer of Object.values(tileRenderers)) {
      tileRenderer.resize()
    }
  }

  function queueRender() {
    if (needsRender) return
    needsRender = true

    requestAnimationFrame(() => {
      needsRender = false
      renderFrame()
    })
  }

  function queueRenderTiles() {
    Object.values(tileRenderers).forEach(tileRenderer => tileRenderer.queueRender())
  }

  function queueRenderTile(tileId: TileId) {
    tileRenderers[tileId]?.queueRender()
  }

  function drawTileToGrid(tileId: TileId, imageData: ImageData) {
    if (!tilesetManager.tileGrid.value) return
    tilesetManager.tileGrid.value.eachWithTileId(tileId, (tileX, tileY, tile) => {
      if (!tile) return
      const { x, y } = state.tilePixelToGridPixel(tileX, tileY, 0, 0)

      writeImageData(tileGridImageData.get()!, imageData, x, y)
    })

    queueRenderTile(tileId)
  }

  function drawEdges(ctx: CanvasRenderingContext2D) {
    const sketch = tilesetManager.tileGridEdgeColorSketch

    ctx.globalAlpha = 0.5
    ctx.drawImage(sketch.canvas, 0, 0)
    ctx.globalAlpha = 1
  }

  function renderFrame() {
    if (!tileGridPixelCanvas) return
    const { canvas, ctx } = tileGridPixelCanvas

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // pixel space
    ctx.scale(state.scale, state.scale)

    const targetImageData = tileGridImageData?.get()
    if (targetImageData) {
      putImageDataScaled(ctx, targetImageData.width, targetImageData.height, targetImageData)
    }
    drawEdges(ctx)

    // screen space
    ctx.setTransform(1, 0, 0, 1, 0, 0)

    gridCache.drawGrid(ctx)
  }

  return {
    state,
    cursor: makeCursorCache(state, toolContext),
    registerTileCanvas,
    setTileGridCanvas,
    drawTileToGrid,
    gridCache,
    resize,
    queueRender,
    queueRenderTile,
    queueRenderTiles,
    toolContext,
  }
}
