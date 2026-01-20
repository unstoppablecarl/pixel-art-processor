import { computed, ref, type Ref, watchEffect } from 'vue'
import type { Point } from '../node-data-types/BaseDataStructure.ts'
import { PixelMap } from '../node-data-types/PixelMap.ts'
import { mirrorTilePixelHorizontal, mirrorTilePixelVertical } from '../util/data/Grid.ts'
import { type RGBA, setImageDataPixelsColor } from '../util/html-dom/ImageData.ts'
import { Sketch } from '../util/html-dom/Sketch.ts'
import type { ImageDataRef } from '../vue/vue-image-data.ts'
import { makeWangTileEdgesPixelMap } from './wang-tile-vue-helpers.ts'
import { WangGrid } from './WangGrid.ts'
import {
  oppositeEdge,
  type TileId,
  type TileWithEligibleEdges,
  type WangTile,
  type WangTileEdge,
  WangTileset,
} from './WangTileset.ts'

export function make4EdgeWangGrid<T>(tileset: WangTileset<T>): WangGrid<T> | false {
  const width = 5
  const height = 5
  const grid = new WangGrid<T>(5, 5)

  const tileIds: string[][] = [
    ['tile-0-3-1-2', 'tile-0-3-1-3', 'tile-0-2-1-3', 'tile-0-2-1-2', 'tile-0-3-1-2'],
    ['tile-1-3-1-2', 'tile-1-3-1-3', 'tile-1-2-1-3', 'tile-1-2-1-2', 'tile-1-3-1-2'],
    ['tile-1-3-0-2', 'tile-1-3-0-3', 'tile-1-2-0-3', 'tile-1-2-0-2', 'tile-1-3-0-2'],
    ['tile-0-3-0-2', 'tile-0-3-0-3', 'tile-0-2-0-3', 'tile-0-2-0-2', 'tile-0-3-0-2'],
    ['tile-0-3-1-2', 'tile-0-3-1-3', 'tile-0-2-1-3', 'tile-0-2-1-2', 'tile-0-3-1-2'],
  ]

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const id = tileIds[y][x]
      const tile = tileset.byId.get(id as TileId)
      if (!tile) return false
      grid.set(x, y, tile)
    }
  }

  return grid
}

export function make4EdgeWangTileset() {

  const verticalA = {
    edgeValue: 0,
    eligibleForN: true,
    eligibleForS: true,
  }
  const verticalB = {
    edgeValue: 1,
    eligibleForN: true,
    eligibleForS: true,
  }
  const horizontalA = {
    edgeValue: 2,
    eligibleForW: true,
    eligibleForE: true,
  }
  const horizontalB = {
    edgeValue: 3,
    eligibleForW: true,
    eligibleForE: true,
  }

  const edges: TileWithEligibleEdges<number>[] = [verticalA, verticalB, horizontalA, horizontalB] as const
  return WangTileset.createFromLimitedEdges<number>(edges)
}

export const defaultColors: RGBA[] = [
  { r: 255, g: 0, b: 0, a: 255 / 2 },
  { r: 0, g: 255, b: 0, a: 255 / 2 },
  { r: 0, g: 0, b: 255, a: 255 / 2 },
  { r: 255, g: 255, b: 0, a: 255 / 2 },
]

export function make4EdgeWangTileImages(
  tileset: WangTileset<number>,
  tileSize: Ref<number>,
) {

  const cachedWangTileEdgeColorPixelMaps = computed((): Record<TileId, PixelMap> => {
    return Object.fromEntries(tileset.tiles.map(tile => [
        tile.id,
        makeWangTileEdgesPixelMap(tileSize.value, tile),
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

  const gridWidth = ref(5)
  const gridHeight = ref(5)

  const canvasWidth = computed(() => tileSize.value * gridWidth.value)
  const canvasHeight = computed(() => tileSize.value * gridHeight.value)
  const tileGridEdgeColorSketch = new Sketch(0, 0)
  watchEffect(() => tileGridEdgeColorSketch.setSize(
    canvasWidth.value,
    canvasHeight.value,
  ))

  const tileGrid = computed(() => make4EdgeWangGrid(tileset))

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

  function getTilesWithSameEdge(tile: WangTile<number>, edge: WangTileEdge) {
    const edgeId = tile.edges[edge]
    const tilesWithEdge = tileset.tilesWithEdge(edgeId)
    const tilesWithSameEdgeOnSameSide = tilesWithEdge.filter(t => t.edges[edge] === edgeId)
    const tilesWithSameEdgeOnOppositeSide = tilesWithEdge.filter(t => t.edges[oppositeEdge[edge]] === edgeId)

    return {
      sameEdge: tilesWithSameEdgeOnSameSide,
      mirroredEdge: tilesWithSameEdgeOnOppositeSide,
    }
  }

  function getPixelEdgeDirections(
    point: Point,
    tileSize: number,
    borderThickness: number = 1,
    result: Record<WangTileEdge, Point[]>,
  ): Record<WangTileEdge, Point[]> {
    const dir: Record<WangTileEdge, (p: Point) => boolean> = {
      N: (p: Point) => p.y < borderThickness,
      S: (p: Point) => p.y >= tileSize - borderThickness,
      E: (p: Point) => p.x >= tileSize - borderThickness,
      W: (p: Point) => p.x < borderThickness,
    }

    Object.entries(dir).forEach(([edge, fn]) => {
      if (!fn(point)) return
      result[edge as WangTileEdge].push({ x: point.x, y: point.y })
    })
    return result
  }

  function duplicateEdgePixels(
    tilesetImageRefs: Record<TileId, ImageDataRef>,
    tileId: TileId,
    pixels: Point[],
    color: RGBA,
    borderThickness: number = 10,
  ) {
    const pixelEdges: Record<WangTileEdge, Point[]> = {
      N: [],
      S: [],
      E: [],
      W: [],
    }
    const tile = tileset.byId.get(tileId)!

    pixels.forEach(p => getPixelEdgeDirections(p, tileSize.value, borderThickness, pixelEdges))

    if (pixelEdges.N.length === 0
      && pixelEdges.S.length === 0
      && pixelEdges.E.length === 0
      && pixelEdges.W.length === 0
    ) return

    console.log({ pixelEdges })
    let affectedTiles: WangTile<number>[] = []

    Object.entries(pixelEdges).forEach(([e, pixels]) => {
      const edge = e as WangTileEdge
      const { sameEdge, mirroredEdge } = getTilesWithSameEdge(tile, edge)

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
  }
}