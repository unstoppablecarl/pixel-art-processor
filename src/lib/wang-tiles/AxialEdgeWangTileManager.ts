import { computed, type ComputedRef, type Ref, watchEffect } from 'vue'
import type { Point } from '../node-data-types/BaseDataStructure.ts'
import { PixelMap } from '../node-data-types/PixelMap.ts'
import type { Direction } from '../pipeline/_types.ts'
import { arrayIndexToColor } from '../util/color.ts'
import { getPointsInEdgeMargins, mirrorTilePixelHorizontal, mirrorTilePixelVertical } from '../util/data/Grid.ts'
import { type RGBA, setImageDataPixelsColor } from '../util/html-dom/ImageData.ts'
import { Sketch } from '../util/html-dom/Sketch.ts'
import type { ImageDataRef } from '../vue/vue-image-data.ts'
import { makeWangTileEdgesPixelMap } from './wang-tile-vue-helpers.ts'
import { makeAxialEdgeWangGrid } from './WangGrid.ts'
import { AxialEdgeWangTileset, type TileId, type WangTile } from './WangTileset.ts'

export function makeAxialEdgeWangTileManager(
  tileset: ComputedRef<AxialEdgeWangTileset<number>>,
  tileSize: Ref<number>,
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

  const tileGrid = computed(() => makeAxialEdgeWangGrid(tileset.value).toWrapped())
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

  function gridPixelToTilePixel(gridPixelX: number, gridPixelY: number) {
    if (!tileGrid.value) return
    const x = Math.floor(gridPixelX / tileSize.value)
    const y = Math.floor(gridPixelY / tileSize.value)
    return {
      tile: tileGrid.value.get(x, y),
      pixelX: gridPixelX % tileSize.value,
      pixelY: gridPixelY % tileSize.value,
    }
  }

  function tilePixelToGridPixel(tileX: number, tileY: number, pixelX = 0, pixelY = 0) {
    return {
      gridX: tileX * tileSize.value + pixelX,
      gridY: tileY * tileSize.value + pixelY,
    }
  }

  function duplicateEdgePixels(
    tilesetImageRefs: Record<TileId, ImageDataRef>,
    tileId: TileId,
    pixels: Point[],
    color: RGBA,
    borderThickness: number = 10,
  ) {
    const pixelEdges: Record<Direction, Point[]> = {
      N: [],
      S: [],
      E: [],
      W: [],
    }
    const tile = tileset.value.byId.get(tileId)!

    pixels.forEach(p => getPointsInEdgeMargins(p, tileSize.value, borderThickness, pixelEdges))

    if (pixelEdges.N.length === 0
      && pixelEdges.S.length === 0
      && pixelEdges.E.length === 0
      && pixelEdges.W.length === 0
    ) return

    let affectedTiles: WangTile<number>[] = []

    Object.entries(pixelEdges).forEach(([e, pixels]) => {
      const edge = e as Direction
      const { sameEdge, mirroredEdge } = tileset.value.getTilesWithSameEdge(tile, edge)

      affectedTiles = [...affectedTiles, ...sameEdge, ...mirroredEdge]

      sameEdge.forEach(t => {
        const imageData = tilesetImageRefs[t.id].get()!
        setImageDataPixelsColor(imageData, pixels, color)
      })

      mirroredEdge.forEach(t => {
        const imageData = tilesetImageRefs[t.id].get()!

        let mirroredPixels: Point[]
        if (edge === 'N' || edge === 'S') {
          mirroredPixels = pixels.map(p => mirrorTilePixelVertical(p.x, p.y, tileSize.value))
        } else {
          mirroredPixels = pixels.map(p => mirrorTilePixelHorizontal(p.x, p.y, tileSize.value))
        }

        setImageDataPixelsColor(imageData, mirroredPixels, color)
      })
    })

    return affectedTiles
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
    duplicateEdgePixels,
    tilePixelToGridPixel,
    gridPixelToTile,
    gridPixelToTilePixel,
    edgeColors,
  }
}