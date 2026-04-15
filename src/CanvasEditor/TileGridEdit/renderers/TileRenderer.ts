import { makeCanvasFrameRenderer, makePixelData, makeRenderQueue, setPixelData } from 'pixel-data-js'
import { drawText, makePixelCanvas } from '../../../lib/util/html-dom/PixelCanvas.ts'
import type { TileId } from '../../../lib/wang-tiles/WangTileset.ts'
import type { PixelGridLineRenderer } from '../../_core/renderers/PixelGridLineRenderer.ts'
import { makeSingleTileSync } from '../data/TileSync.ts'
import type { TileGridEditorState } from '../TileGridEditorState.ts'
import type { TileGridToolset } from '../TileGridToolset.ts'
import type { TileGridEdgeColorRenderer } from './TileGridEdgeColorRenderer.ts'

export type TileRenderer = ReturnType<typeof makeTileRenderer>

export function makeTileRenderer(
  {
    tileId,
    state,
    gridCache,
    tileCanvas,
    toolset,
    tileGridEdgeColorRenderer,
  }: {
    tileId: TileId,
    state: TileGridEditorState,
    gridCache: PixelGridLineRenderer,
    tileCanvas: HTMLCanvasElement,
    toolset: TileGridToolset,
    tileGridEdgeColorRenderer: TileGridEdgeColorRenderer,
  }) {
  const renderCanvasFrame = makeCanvasFrameRenderer()
  const pixelCanvas = makePixelCanvas(tileCanvas)

  const tileSync = makeSingleTileSync(tileId)
  let pixelData = makePixelData(new ImageData(
    state.reactive.scaledTileSize.value,
    state.reactive.scaledTileSize.value
  ))

  function resize() {
    const size = state.reactive.scaledTileSize.value
    pixelCanvas.resize(size, size)
    setPixelData(pixelData, new ImageData(size, size))
    tileSync.reset()
    queueRender()
  }

  function updateTile() {
    tileSync(state.tileSheet, () => {
      pixelData = state.tileSheet.extractTile(tileId)
    })
  }

  const queueRender = makeRenderQueue(() => {
    updateTile()

    renderCanvasFrame(
      pixelCanvas,
      state.scale,
      () => pixelData.imageData,
      (ctx) => {
        toolset.currentToolHandler.tilePixelOverlayDraw?.(ctx, tileId)
        if (state.reactive.showTileEdgeColors.value) {
          tileGridEdgeColorRenderer.drawTileEdges(ctx, tileId)
        }
      },
      (ctx) => {
        if (state.shouldDrawGrid()) {
          gridCache.draw(ctx)
        }
        if (state.reactive.showTileIds.value) {
          const tile = state.reactive.tileset.value.byId.get(tileId)!
          drawText(ctx, tile.id + ': ' + tile.id)
        }
        toolset.currentToolHandler.tileScreenOverlayDraw?.(ctx, tileId)
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
