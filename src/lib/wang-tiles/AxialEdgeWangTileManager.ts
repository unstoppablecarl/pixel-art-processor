import { computed, type ComputedRef, type Ref, watchEffect } from 'vue'
import { PixelMap } from '../node-data-types/PixelMap.ts'
import { arrayIndexToColor } from '../util/color.ts'
import { Sketch } from '../util/html-dom/Sketch.ts'
import { makeWangTileEdgesPixelMap } from './wang-tile-vue-helpers.ts'
import { AxialEdgeWangGrid, makeAxialEdgeWangGrid } from './WangGrid.ts'
import { AxialEdgeWangTileset, type TileId } from './WangTileset.ts'

export type AxialEdgeWangTileManager = ReturnType<typeof makeAxialEdgeWangTileManager>

export function makeAxialEdgeWangTileManager(
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
    return tileGrid.value.get(x, y)
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
    gridPixelToTile,
    edgeColors,
  }
}

