import { putImageDataScaled } from '../../lib/util/html-dom/ImageData.ts'
import { getCanvasPixelContext, type PixelCanvas } from '../../lib/util/misc.ts'
import { imageDataRef } from '../../lib/vue/vue-image-data.ts'
import type { TileId } from '../../lib/wang-tiles/WangTileset.ts'
import type { LocalToolContext } from './_canvas-editor-types.ts'
import type { TileGrid } from './data/TileGrid.ts'
import type { EditorState } from './EditorState.ts'
import type { GlobalToolContext, GlobalToolManager } from './GlobalToolManager.ts'
import { renderCanvasFrame } from './lib/canvas-frame.ts'
import { makePixelGridCache } from './lib/PixelGridCache.ts'
import { makeTileRenderer, type TileRenderer } from './TileRenderer.ts'
import { makeCursorCache } from './tools/brush-cursor.ts'

export type TileGridRenderer = ReturnType<typeof makeTileGridRenderer>

export function makeTileGridRenderer(
  {
    state,
    toolContext,
    tileGrid,
    globalToolManager,
    localToolContext,
  }: {
    state: EditorState,
    toolContext: GlobalToolContext,
    tileGrid: TileGrid,
    globalToolManager: GlobalToolManager,
    localToolContext: () => LocalToolContext

  }) {
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

  function registerTileCanvas(tileId: TileId, tileCanvas: HTMLCanvasElement) {

    tileRenderers[tileId] = makeTileRenderer({
      tileId,
      state,
      getTileImageData: () => state.tileSheet.extractTile(tileId),
      gridCache,
      tileCanvas,
      tileGrid,
      tilePixelOverlayDraw: (ctx) => {
      },
      tileScreenOverlayDraw: (ctx) => {
      },
    })

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

  function drawAllTiles(ctx: CanvasRenderingContext2D) {

    tileGrid.tileGrid.value.each((tileX, tileY, tile) => {
      if (!tile) return
      const tileId = tile.id
      const tileRenderer = tileRenderers[tileId]
      if (!tileRenderer) return

      const { x, y } = tileGrid.tileCoordToGridPixel(tileX, tileY)

      const tileImage = state.tileSheet.extractTile(tileId)
      putImageDataScaled(ctx, tileImage.width, tileImage.height, tileImage, x, y)
    })
  }

  function renderFrame() {

    const drawPixelLayer = (ctx: CanvasRenderingContext2D) => {
      drawAllTiles(ctx)
      tileGrid.drawGridEdges(ctx)
      globalToolManager.currentToolHandler?.pixelOverlayDraw?.(localToolContext(), ctx)
    }

    const drawScreenLayer = (ctx: CanvasRenderingContext2D) => {
      gridCache.drawGrid(ctx)
      globalToolManager.currentToolHandler?.screenOverlayDraw?.(localToolContext(), ctx)
    }

    renderCanvasFrame(
      tileGridPixelCanvas,
      state.scale,
      () => tileGridImageData?.get(),
      drawPixelLayer,
      drawScreenLayer,
    )
  }

  return {
    state,
    cursor: makeCursorCache(state, toolContext),
    registerTileCanvas,
    setTileGridCanvas,
    gridCache,
    resize,
    queueRender,
    queueRenderTile,
    queueRenderTiles,
    toolContext,
  }
}
