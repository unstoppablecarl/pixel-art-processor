import { drawText, makePixelCanvas } from '../../../../lib/util/html-dom/PixelCanvas.ts'
import { makeCanvasFrameRenderer, makeRenderQueue } from '../../../../lib/util/html-dom/renderCanvasFrame.ts'
import type { TileId } from '../../../../lib/wang-tiles/WangTileset.ts'
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
    tileGridEdgeColorRenderer: TileGridEdgeColorRenderer
  }) {
  const renderCanvasFrame = makeCanvasFrameRenderer()
  const pixelCanvas = makePixelCanvas(tileCanvas)

  const tileSync = makeSingleTileSync(tileId)
  let tileImageData = new ImageData(state.scaledTileSize, state.scaledTileSize)

  function resize() {
    pixelCanvas.resize(state.scaledTileSize, state.scaledTileSize)
    tileImageData = new ImageData(state.scaledTileSize, state.scaledTileSize)
    tileSync.reset()
    queueRender()
  }

  function updateTile() {
    tileSync(state.tileSheet, () => {
      tileImageData = state.tileSheet.extractTile(tileId)
    })
  }

  const queueRender = makeRenderQueue(() => {
    updateTile()

    renderCanvasFrame(
      pixelCanvas,
      state.scale,
      () => tileImageData!,
      (ctx) => {
        toolset.currentToolHandler.tilePixelOverlayDraw?.(ctx, tileId)
        tileGridEdgeColorRenderer.drawTileEdges(ctx, tileId)
      },
      (ctx) => {
        if (state.shouldDrawGrid()) {
          gridCache.draw(ctx)
        }
        if (state.drawTileIds) {
          const tile = state.tileset.byId.get(tileId)!
          drawText(ctx, tile.index + ': ' + tile.id)
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
