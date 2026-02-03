import { computed, type ComputedRef, type Ref, watchEffect } from 'vue'
import { arrayIndexToColor } from '../../../../lib/util/color.ts'
import { putImageData } from '../../../../lib/util/html-dom/ImageData.ts'
import { Sketch } from '../../../../lib/util/html-dom/Sketch.ts'
import { makeWangTileEdgesPixelMap } from '../../../../lib/wang-tiles/wang-tile-vue-helpers.ts'
import { type AxialEdgeWangGrid } from '../../../../lib/wang-tiles/WangGrid.ts'
import type { TileId } from '../../../../lib/wang-tiles/WangTileset.ts'

export type TileGridEdgeColorRenderer = ReturnType<typeof makeTileGridEdgeColorRenderer>

export function makeTileGridEdgeColorRenderer(
  tileGrid: ComputedRef<AxialEdgeWangGrid<number>>,
  tileSize: Ref<number>,
) {

  const EDGE_COLOR_ALPHA = 0.5

  const edgeColors = computed(() => {
    const edgeValues = tileGrid.value.tileSet.edgeValues()
    return edgeValues.map((edgeValue) => arrayIndexToColor(edgeValue, edgeValues.length, 255 * EDGE_COLOR_ALPHA))
  })

  const cachedWangTileEdgeColorImageData = computed((): Record<TileId, ImageData> => {
    return Object.fromEntries(tileGrid.value.tileSet.tiles.map((tile, index) => [
        tile.id,
        makeWangTileEdgesPixelMap(tileSize.value, tile, edgeColors.value).toImageData(),
      ],
    ))
  })

  const tileGridEdgeColorSketch = new Sketch(0, 0)
  watchEffect(() => tileGridEdgeColorSketch.resize(
    tileSize.value * tileGrid.value.width,
    tileSize.value * tileGrid.value.height,
  ))

  // draw colored tile edges
  watchEffect(() => {
    if (!tileGrid.value) return
    tileGrid.value.each((tx, ty, tile) => {
      if (!tile) return
      const imageData = cachedWangTileEdgeColorImageData.value[tile.id]
      const x = tx * tileSize.value
      const y = ty * tileSize.value

      tileGridEdgeColorSketch.putImageData(imageData, x, y)
    })
  })

  function drawGridEdges(ctx: CanvasRenderingContext2D) {
    const sketch = tileGridEdgeColorSketch

    ctx.globalAlpha = 0.5
    ctx.drawImage(sketch.canvas, 0, 0)
    ctx.globalAlpha = 1
  }

  function drawTileEdges(
    ctx: CanvasRenderingContext2D,
    tileId: TileId,
    x = 0,
    y = 0,
  ) {
    const imageData = cachedWangTileEdgeColorImageData.value[tileId]
    ctx.globalAlpha = 0.5
    putImageData(ctx, imageData, { dx: x, dy: y })
    ctx.globalAlpha = 1
  }

  return {
    drawGridEdges,
    drawTileEdges,
    cachedWangTileEdgeColorImageData,
  }
}