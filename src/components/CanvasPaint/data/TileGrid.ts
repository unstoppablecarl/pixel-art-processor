import { computed, type ComputedRef, type Ref, watchEffect } from 'vue'
import type { Point } from '../../../lib/node-data-types/BaseDataStructure.ts'
import type { PixelMap } from '../../../lib/node-data-types/PixelMap.ts'
import { arrayIndexToColor } from '../../../lib/util/color.ts'
import { putImageDataScaled } from '../../../lib/util/html-dom/ImageData.ts'
import { Sketch } from '../../../lib/util/html-dom/Sketch.ts'
import { makeWangTileEdgesPixelMap } from '../../../lib/wang-tiles/wang-tile-vue-helpers.ts'
import { type AxialEdgeWangGrid, makeAxialEdgeWangGrid } from '../../../lib/wang-tiles/WangGrid.ts'
import type { AxialEdgeWangTileset, TileId } from '../../../lib/wang-tiles/WangTileset.ts'

export type TileGrid = ReturnType<typeof makeTileGrid>

export function makeTileGrid(
  tileset: ComputedRef<AxialEdgeWangTileset<number>>,
  tileSize: Ref<number>,
  tileGridFactory: (tileset: AxialEdgeWangTileset<number>) => AxialEdgeWangGrid<number> = makeAxialEdgeWangGrid,
) {

  const edgeColors = computed(() => {
    const edgeValues = tileset.value.edgeValues()
    return edgeValues.map((edgeValue) => arrayIndexToColor(edgeValue, edgeValues.length, 255 * 0.5))
  })

  const cachedWangTileEdgeColorPixelMaps = computed((): Record<TileId, PixelMap> => {
    return Object.fromEntries(tileset.value.tiles.map((tile, index) => [
        tile.id,
        makeWangTileEdgesPixelMap(tileSize.value, tile, edgeColors.value),
      ],
    ))
  })

  const cachedWangTileEdgeColorImageData = computed((): Record<TileId, ImageData> => {
    return Object.fromEntries(
      Object.entries(cachedWangTileEdgeColorPixelMaps.value).map(([tileId, item]) => [
          tileId,
          item.toImageData(),
        ],
      ),
    )
  })

  const tileGrid = computed(() => tileGridFactory(tileset.value))
  const gridWidth = computed(() => tileGrid.value.width)
  const gridHeight = computed(() => tileGrid.value.height)

  const canvasWidth = computed(() => tileSize.value * gridWidth.value)
  const canvasHeight = computed(() => tileSize.value * gridHeight.value)
  const tileGridEdgeColorSketch = new Sketch(0, 0)
  watchEffect(() => tileGridEdgeColorSketch.resize(
    canvasWidth.value,
    canvasHeight.value,
  ))

  // draw colored tile edges
  watchEffect(() => {
    if (!tileGrid.value) return
    tileGrid.value.each((tx, ty, tile) => {
      if (!tile) return
      const pixelMap = cachedWangTileEdgeColorPixelMaps.value[tile.id]
      const x = tx * tileSize.value
      const y = ty * tileSize.value

      tileGridEdgeColorSketch.putImageData(pixelMap.toImageData(), x, y)
    })
  })

  function gridPixelToTile(gridPixelX: number, gridPixelY: number) {
    if (!tileGrid.value) return
    const x = Math.floor(gridPixelX / tileSize.value)
    const y = Math.floor(gridPixelY / tileSize.value)
    const tile = tileGrid.value.get(x, y)
    if (!tile) return

    return {
      tileX: x,
      tileY: y,
      tile,
    }
  }

  function gridPixelToTilePixel(gridPixelX: number, gridPixelY: number): Point {
    return {
      x: gridPixelX % tileSize.value,
      y: gridPixelY % tileSize.value,
    }
  }

  function drawGridEdges(ctx: CanvasRenderingContext2D) {
    const sketch = tileGridEdgeColorSketch

    ctx.globalAlpha = 0.5
    ctx.drawImage(sketch.canvas, 0, 0)
    ctx.globalAlpha = 1
  }

  function drawTileEdges(ctx: CanvasRenderingContext2D, tileId: TileId) {
    const imageData = cachedWangTileEdgeColorImageData.value[tileId]
    ctx.globalAlpha = 0.5
    putImageDataScaled(ctx, tileSize.value, tileSize.value, imageData)
    ctx.globalAlpha = 1
  }

  function getTileInfo(tileId: TileId) {
    return tileGrid.value.mapWithTileId(tileId, (tileX, tileY, tile) => {
      return {
        tileX,
        tileY,
        gridPixelBounds: {
          x: tileX * tileSize.value,
          y: tileY * tileSize.value,
          w: tileSize.value,
          h: tileSize.value,
        },
        tile,
      }
    })
  }

  function tileCoordToGridPixel(tileX: number, tileY: number, pixelX = 0, pixelY = 0): Point {
    return {
      x: tileX * tileSize.value + pixelX,
      y: tileY * tileSize.value + pixelY,
    }
  }

  return {
    tileSize,
    gridWidth,
    gridHeight,
    canvasWidth,
    canvasHeight,
    tileset,
    tileGrid,
    tileGridEdgeColorSketch,
    cachedWangTileEdgeColorPixelMaps,
    cachedWangTileEdgeColorImageData,
    drawGridEdges,
    drawTileEdges,
    gridPixelToTile,
    gridPixelToTilePixel,
    tileCoordToGridPixel,
    edgeColors,
    getTileInfo,
  }
}