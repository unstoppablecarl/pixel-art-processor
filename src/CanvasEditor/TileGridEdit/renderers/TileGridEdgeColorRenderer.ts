import { makeCanvasPixelDataRenderer, makePixelData, makeReusableOffscreenCanvas, type PixelData } from 'pixel-data-js'
import { computed, watchEffect } from 'vue'
import { arrayIndexToColor } from '../../../lib/util/data/color.ts'
import { makeWangTileEdgesPixelMap } from '../../../lib/wang-tiles/wang-tile-vue-helpers.ts'
import type { TileId } from '../../../lib/wang-tiles/WangTileset.ts'
import type { TileGridManager } from '../data/TileGridManager.ts'

export type TileGridEdgeColorRenderer = ReturnType<typeof makeTileGridEdgeColorRenderer>

export function makeTileGridEdgeColorRenderer(
  tileGridManager: TileGridManager,
) {
  const EDGE_COLOR_ALPHA = 0.25

  const getGridCache = makeReusableOffscreenCanvas()
  const renderTile = makeCanvasPixelDataRenderer()

  let gridCache = getGridCache(1, 1)

  const edgeColors = computed(() => {
    const edgeValues = tileGridManager.tileGrid.value.tileSet.edgeValues()
    return edgeValues.map((edgeValue) => arrayIndexToColor(edgeValue, edgeValues.length, 255))
  })

  const cachedWangTileEdgeColorImageData = computed((): Record<TileId, PixelData> => {
    return Object.fromEntries(tileGridManager.tileGrid.value.tileSet.tiles.map((tile) => [
        tile.id,
        makePixelData(makeWangTileEdgesPixelMap(tileGridManager.tileSize.value, tile, edgeColors.value).toImageData()),
      ],
    ))
  })

  watchEffect(() => {
    const tileSize = tileGridManager.tileSize.value
    const tileGrid = tileGridManager.tileGrid.value

    gridCache = getGridCache(
      tileSize * tileGrid.width,
      tileSize * tileGrid.height,
    )
  })

  // draw colored tile edges
  watchEffect(() => {
    const tileGrid = tileGridManager.tileGrid.value
    if (!tileGrid) return
    const tileSize = tileGridManager.tileSize.value

    tileGrid.each((tx, ty, tile) => {
      if (!tile) return
      const pixelData = cachedWangTileEdgeColorImageData.value[tile.id]
      const x = tx * tileSize
      const y = ty * tileSize

      gridCache = getGridCache(
        tileSize * tileGrid.width,
        tileSize * tileGrid.height,
      )

      gridCache.ctx.putImageData(pixelData.imageData, x, y)
    })
  })

  function drawGridEdges(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) {
    ctx.globalAlpha = EDGE_COLOR_ALPHA
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
    ctx.globalAlpha = EDGE_COLOR_ALPHA
    renderTile(ctx, pixelData, x, y)
    ctx.globalAlpha = 1
  }

  return {
    drawGridEdges,
    drawTileEdges,
    cachedWangTileEdgeColorImageData,
  }
}