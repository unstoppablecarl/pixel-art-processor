import { writeImageData } from '../../lib/util/html-dom/ImageData.ts'
import { drawText, makePixelCanvas, type PixelCanvas } from '../../lib/util/html-dom/PixelCanvas.ts'
import { imageDataRef } from '../../lib/vue/vue-image-data.ts'
import type { TileId } from '../../lib/wang-tiles/WangTileset.ts'
import type { LocalToolContext } from './_canvas-editor-types.ts'
import type { EditorState } from './EditorState.ts'
import type { GlobalToolContext, GlobalToolManager } from './GlobalToolManager.ts'
import { makeRenderQueue, renderCanvasFrame } from './lib/canvas-frame.ts'
import { makePixelGridLineRenderer } from './renderers/PixelGridLineRenderer.ts'
import { makeTileRenderer, type TileRenderer } from './TileRenderer.ts'
import { makeCursorCache } from './tools/brush-cursor.ts'

export type TileGridRenderer = ReturnType<typeof makeTileGridRenderer>

export function makeTileGridRenderer(
  {
    state,
    toolContext,
    globalToolManager,
    localToolContext,
  }: {
    state: EditorState,
    toolContext: GlobalToolContext,
    globalToolManager: GlobalToolManager,
    localToolContext: () => LocalToolContext
  }) {

  let tileGridPixelCanvas: PixelCanvas | undefined

  const tileGridImageDataRef = imageDataRef()
  const tileRenderers: Record<TileId, TileRenderer> = {}
  const gridCache = makePixelGridLineRenderer(state)

  function setTileGridCanvas(canvas: HTMLCanvasElement) {
    tileGridPixelCanvas = makePixelCanvas(canvas)
    resize()
    queueRenderGrid()
  }

  function registerTileCanvas(tileId: TileId, tileCanvas: HTMLCanvasElement) {
    tileRenderers[tileId] = makeTileRenderer({
      tileId,
      state,
      getTileImageData: () => state.tileSheet.extractTile(tileId),
      gridCache,
      tileCanvas,
      globalToolManager,
      localToolContext,
    })

    queueRenderTile(tileId)
  }

  function resize() {
    if (!tileGridPixelCanvas) return
    tileGridPixelCanvas.resize(state.gridScreenWidth, state.gridScreenHeight)
    gridCache.updateGridCache()
    tileGridImageDataRef.resize(state.gridScreenWidth, state.gridScreenHeight)

    for (const tileRenderer of Object.values(tileRenderers)) {
      tileRenderer.resize()
    }
  }

  function queueRenderTiles(tileIds?: TileId[]) {
    Object.entries(tileRenderers).forEach(([tileId, tileRenderer]) => {
      if (!tileIds || tileIds.includes(tileId as TileId)) {
        tileRenderer.queueRender()
      }
    })
  }

  function queueRenderTile(tileId: TileId) {
    tileRenderers[tileId]?.queueRender()
  }

  function drawTileGrid() {
    tileGridImageDataRef.resize(state.gridScreenWidth, state.gridScreenHeight)
    state.tileGrid.each((tileX, tileY, tile) => {
      if (!tile) return
      const tileId = tile.id
      const { x, y } = state.tileGridManager.tileCoordToGridPixel(tileX, tileY)
      const tileImage = state.tileSheet.extractTile(tileId)
      writeImageData(tileGridImageDataRef.get()!, tileImage, x, y, 0, 0, tileImage.width, tileImage.height)
    })
  }

  const queueRenderGrid = makeRenderQueue(() => {

    drawTileGrid()
    const drawPixelLayer = (ctx: CanvasRenderingContext2D) => {
      globalToolManager.currentToolHandler?.gridPixelOverlayDraw?.(localToolContext(), ctx)
      state.tileGridManager.tileGridEdgeColorRenderer.drawGridEdges(ctx)
    }

    const drawScreenLayer = (ctx: CanvasRenderingContext2D) => {
      if (state.shouldDrawGrid) {
        gridCache.drawGrid(ctx)
      }

      state.tileGrid.each((tileX, tileY, tile) => {
        const x = tileX * state.tileSize * state.scale
        const y = tileY * state.tileSize * state.scale
        drawText(ctx, tile.index + '', x, y)
      })

      globalToolManager.currentToolHandler?.gridScreenOverlayDraw?.(localToolContext(), ctx)
    }

    renderCanvasFrame(
      tileGridPixelCanvas,
      state.scale,
      () => tileGridImageDataRef?.get(),
      drawPixelLayer,
      drawScreenLayer,
    )
  })

  return {
    state,
    tileGridImageDataRef,
    cursor: makeCursorCache(state, toolContext),
    registerTileCanvas,
    setTileGridCanvas,
    gridCache,
    resize,
    queueRenderGrid,
    queueRenderTile,
    queueRenderTiles,
    queueRenderAll: () => {
      queueRenderGrid()
      queueRenderTiles()
    },
    toolContext,
  }
}
