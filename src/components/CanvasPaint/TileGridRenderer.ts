import { writeImageData } from '../../lib/util/html-dom/ImageData.ts'
import { getCanvasPixelContext, type PixelCanvas } from '../../lib/util/misc.ts'
import { imageDataRef } from '../../lib/vue/vue-image-data.ts'
import type { AxialEdgeWangTileManager } from '../../lib/wang-tiles/AxialEdgeWangTileManager.ts'
import type { TileId } from '../../lib/wang-tiles/WangTileset.ts'
import type { DrawLayer } from './_canvas-editor-types.ts'
import type { EditorState } from './EditorState.ts'
import type { GlobalToolContext } from './GlobalToolManager.ts'
import { renderCanvasFrame } from './lib/canvas-frame.ts'
import { makePixelGridCache } from './lib/PixelGridCache.ts'
import { makeTileRenderer, type TileRenderer } from './TileRenderer.ts'
import { makeCursorCache } from './tools/brush-cursor.ts'

export type TileGridRenderer = ReturnType<typeof makeTileGridRenderer>

export function makeTileGridRenderer(
  {
    state,
    toolContext,
    tilesetManager,
    gridPixelOverlayDraw,
    gridScreenOverlayDraw,
  }: {
    state: EditorState,
    toolContext: GlobalToolContext,
    tilesetManager: AxialEdgeWangTileManager,
    gridPixelOverlayDraw?: DrawLayer,
    gridScreenOverlayDraw?: DrawLayer
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
    const imageDataRef = state.tilesetImageRefs[tileId]

    tileRenderers[tileId] = makeTileRenderer({
      tileId,
      state,
      imageDataRef,
      gridCache,
      tileCanvas,
      tilesetManager,
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

  function drawTileToGrid(tileId: TileId, imageData: ImageData) {
    if (!tilesetManager.tileGrid.value) return
    tilesetManager.tileGrid.value.eachWithTileId(tileId, (tileX, tileY, tile) => {
      if (!tile) return
      const { x, y } = state.tilePixelToGridPixel(tileX, tileY, 0, 0)

      writeImageData(tileGridImageData.get()!, imageData, x, y)
    })

    queueRenderTile(tileId)
  }

  function renderFrame() {

    const drawPixelLayer = (ctx: CanvasRenderingContext2D) => {
      gridPixelOverlayDraw?.(ctx)
    }

    const drawScreenLayer = (ctx: CanvasRenderingContext2D) => {
      gridCache.drawGrid(ctx)
      gridScreenOverlayDraw?.(ctx)
    }

    renderCanvasFrame(
      tileGridPixelCanvas,
      state.scale,
      tileGridImageData,
      drawPixelLayer,
      drawScreenLayer,
    )
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
