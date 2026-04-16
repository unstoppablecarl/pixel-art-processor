import { makeCanvasPixelDataRenderer, makeReusableOffscreenCanvas } from 'pixel-data-js'
import { watchEffect } from 'vue'
import {
  makeCachedWangTileEdgeColorImageDataComputed,
  makeTileSheetEdgeColorsComputed,
} from '../lib/TileSheet-edge-color-computed.ts'
import type { TileId } from '../../../lib/wang-tiles/WangTileset.ts'
import type { TileGridManager } from '../data/TileGridManager.ts'
import type { TileGridEditorState } from '../TileGridEditorState.ts'

export type TileGridEdgeColorRenderer = ReturnType<typeof makeTileGridEdgeColorRenderer>

export function makeTileGridEdgeColorRenderer(
  tileGridManager: TileGridManager,
  state: TileGridEditorState,
) {

  const getGridCache = makeReusableOffscreenCanvas()
  const renderTile = makeCanvasPixelDataRenderer()

  let gridCache = getGridCache(1, 1)

  const edgeColors = makeTileSheetEdgeColorsComputed(tileGridManager.tileSheet)
  const cachedWangTileEdgeColorImageData = makeCachedWangTileEdgeColorImageDataComputed(tileGridManager.tileSheet, edgeColors)

  // draw colored tile edges
  watchEffect(() => {
    const tileGrid = tileGridManager.tileGrid.value
    if (!tileGrid) return
    const tileSize = state.reactive.tileSize.value
    const width = state.reactive.tileGridManager.canvasWidth.value
    const height = state.reactive.tileGridManager.canvasHeight.value

    gridCache = getGridCache(
      width,
      height,
    )

    tileGrid.each((tx, ty, tile) => {
      if (!tile) return
      const pixelData = cachedWangTileEdgeColorImageData.value[tile.id]
      const x = tx * tileSize
      const y = ty * tileSize

      gridCache.ctx.putImageData(pixelData.imageData, x, y)
    })
  })

  function drawGridEdges(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) {
    ctx.globalAlpha = state.reactive.showTileEdgeColorsOpacity.value
    ctx.drawImage(gridCache.canvas, 0, 0)
    ctx.globalAlpha = 1
  }

  function drawTileEdges(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    tileId: TileId,
    x = 0,
    y = 0,
  ) {
    const pixelData = cachedWangTileEdgeColorImageData.value[tileId]
    ctx.globalAlpha = state.reactive.showTileEdgeColorsOpacity.value
    renderTile(ctx, pixelData, x, y)
    ctx.globalAlpha = 1
  }

  return {
    drawGridEdges,
    drawTileEdges,
    cachedWangTileEdgeColorImageData,
  }
}