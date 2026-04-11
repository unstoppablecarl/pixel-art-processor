import { makeCanvasPixelDataRenderer, makePixelData, makeReusableOffscreenCanvas, type PixelData } from '../../../../../pixel-data-js/src'
import { computed, type ComputedRef, type Ref, watchEffect } from 'vue'
import { arrayIndexToColor } from '../../../lib/util/data/color.ts'
import { makeWangTileEdgesPixelMap } from '../../../lib/wang-tiles/wang-tile-vue-helpers.ts'
import { type AxialEdgeWangGrid } from '../../../lib/wang-tiles/WangGrid.ts'
import type { TileId } from '../../../lib/wang-tiles/WangTileset.ts'

export type TileGridEdgeColorRenderer = ReturnType<typeof makeTileGridEdgeColorRenderer>

export function makeTileGridEdgeColorRenderer(
  tileGrid: ComputedRef<AxialEdgeWangGrid<number>>,
  tileSize: Ref<number>,
) {
  const EDGE_COLOR_ALPHA = 0.25

  const getGridCache = makeReusableOffscreenCanvas()
  const renderTile = makeCanvasPixelDataRenderer()

  let gridCache = getGridCache(1, 1)

  const edgeColors = computed(() => {
    const edgeValues = tileGrid.value.tileSet.edgeValues()
    return edgeValues.map((edgeValue) => arrayIndexToColor(edgeValue, edgeValues.length, 255))
  })

  const cachedWangTileEdgeColorImageData = computed((): Record<TileId, PixelData> => {
    return Object.fromEntries(tileGrid.value.tileSet.tiles.map((tile, index) => [
        tile.id,
        makePixelData(makeWangTileEdgesPixelMap(tileSize.value, tile, edgeColors.value).toImageData()),
      ],
    ))
  })

  watchEffect(() => {
    gridCache = getGridCache(
      tileSize.value * tileGrid.value.width,
      tileSize.value * tileGrid.value.height,
    )
  })

  // draw colored tile edges
  watchEffect(() => {
    if (!tileGrid.value) return
    tileGrid.value.each((tx, ty, tile) => {
      if (!tile) return
      const pixelData = cachedWangTileEdgeColorImageData.value[tile.id]
      const x = tx * tileSize.value
      const y = ty * tileSize.value

      // gridCache = getGridCache(
      //   tileSize.value * tileGrid.value.width,
      //   tileSize.value * tileGrid.value.height,
      // )

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