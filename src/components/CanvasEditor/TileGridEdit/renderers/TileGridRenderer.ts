import { writeImageData } from '../../../../lib/util/html-dom/ImageData.ts'
import { drawText, makePixelCanvas, type PixelCanvas } from '../../../../lib/util/html-dom/PixelCanvas.ts'
import { makeCanvasFrameRenderer, makeRenderQueue } from '../../../../lib/util/html-dom/renderCanvasFrame.ts'
import { imageDataRef } from '../../../../lib/vue/vue-image-data.ts'
import type { TileId } from '../../../../lib/wang-tiles/WangTileset.ts'
import { type PixelGridLineRenderer } from '../../_support/renderers/PixelGridLineRenderer.ts'
import type { TileGridEditorState } from '../TileGridEditorState.ts'
import type { CurrentToolRenderer } from './CurrentToolRenderer.ts'
import type { TileGridEdgeColorRenderer } from './TileGridEdgeColorRenderer.ts'
import { makeTileRenderer, type TileRenderer } from './TileRenderer.ts'

export type TileGridRenderer = ReturnType<typeof makeTileGridRenderer>

export function makeTileGridRenderer(
  {
    state,
    gridCache,
    tileGridEdgeColorRenderer
  }: {
    state: TileGridEditorState,
    gridCache: PixelGridLineRenderer,
    tileGridEdgeColorRenderer: TileGridEdgeColorRenderer
  }) {
  const renderCanvasFrame = makeCanvasFrameRenderer()
  const tileGridImageDataRef = imageDataRef()

  let currentToolRenderer: CurrentToolRenderer
  let tileGridPixelCanvas: PixelCanvas | undefined

  const tileRenderers: Record<TileId, TileRenderer> = {}

  function setTileGridCanvas(canvas: HTMLCanvasElement) {
    tileGridPixelCanvas = makePixelCanvas(canvas)
    resize()
    queueRenderGrid()
  }

  function registerTileCanvas(tileId: TileId, tileCanvas: HTMLCanvasElement) {
    if (!currentToolRenderer) throw new Error('currentToolRenderer not set')
    tileRenderers[tileId] = makeTileRenderer({
      tileId,
      state,
      getTileImageData: () => state.tileSheet.extractTile(tileId),
      gridCache,
      tileCanvas,
      currentToolRenderer,
      tileGridEdgeColorRenderer,
    })

    queueRenderTile(tileId)
  }

  function resize() {
    if (!tileGridPixelCanvas) return
    tileGridPixelCanvas.resize(state.gridScreenWidth, state.gridScreenHeight)
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
      const { gx, gy } = state.tileGridGeometry.gridTileToGridPixel(tileX, tileY)
      const tileImage = state.tileSheet.extractTile(tileId)
      writeImageData(tileGridImageDataRef.get()!, tileImage, gx, gy, 0, 0, tileImage.width, tileImage.height)
    })
  }

  const queueRenderGrid = makeRenderQueue(() => {

    drawTileGrid()
    const drawPixelLayer = (ctx: CanvasRenderingContext2D) => {
      currentToolRenderer.gridPixelOverlayDraw(ctx)
      tileGridEdgeColorRenderer.drawGridEdges(ctx)
    }

    const drawScreenLayer = (ctx: CanvasRenderingContext2D) => {
      if (state.shouldDrawGrid()) {
        gridCache!.draw(ctx)
      }
      if (state.drawTileIds) {
        state.tileGrid.each((tileX, tileY, tile) => {
          const x = tileX * state.tileSize * state.scale
          const y = tileY * state.tileSize * state.scale
          drawText(ctx, tile.index + '', x, y)
        })
      }

      currentToolRenderer.gridScreenOverlayDraw(ctx)
    }

    renderCanvasFrame(
      tileGridPixelCanvas!,
      state.scale,
      () => tileGridImageDataRef?.get(),
      drawPixelLayer,
      drawScreenLayer,
    )
  })

  return {
    state,
    tileGridImageDataRef,
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
    setCurrentToolRenderer(val: CurrentToolRenderer) {
      currentToolRenderer = val
    },
  }
}
