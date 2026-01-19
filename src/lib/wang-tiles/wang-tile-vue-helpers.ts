import { computed, reactive, type Ref, watchEffect } from 'vue'
import type { ExtractNodeDataBaseType, NodeDataTypeInstance } from '../node-data-types/_node-data-types.ts'
import { BitMask } from '../node-data-types/BitMask.ts'
import { PixelMap } from '../node-data-types/PixelMap.ts'
import type { RGBA } from '../util/html-dom/ImageData.ts'
import { Sketch } from '../util/html-dom/Sketch.ts'
import { makePrng } from '../util/prng.ts'
import { type BinaryArray, generateChunkedArray } from '../util/prng/binary-array-chunks.ts'
import { type ImageDataRef, imageDataRef } from '../vue/vue-image-data.ts'
import { makeWangGrid } from './WangGrid.ts'
import {
  type TileId,
  type TileWithEligibleEdges,
  type WangTile,
  type WangTileEdge,
  WangTileset,
} from './WangTileset.ts'

export function makeWangTileEdgeConfigDefaults() {
  return {
    visible: true,
    chunks: 5,
    shuffleSeed: 0,

    invert: false,
    minGapSize: 3,
    maxGapSize: 13,
    minChunkSize: 3,
    maxChunkSize: 13,
    padding: 4,
    seed: 0,

    eligibleForN: true,
    eligibleForE: true,
    eligibleForS: true,
    eligibleForW: true,
  }
}

export type WangTileEdgeConfig = ReturnType<typeof makeWangTileEdgeConfigDefaults>

export function generateWangTileEdgePattern(size: number, c: WangTileEdgeConfig): BinaryArray {
  const prng = makePrng(c.seed)

  return generateChunkedArray({
    prng,
    chunks: c.chunks,
    shuffleSeed: c.shuffleSeed,
    length: size,
    minGapSize: c.minGapSize,
    maxGapSize: c.maxGapSize,
    minChunkSize: c.minChunkSize,
    maxChunkSize: c.maxChunkSize,
    padding: c.padding,
    invert: c.invert,
    makePrng,
  })
}

export function wangTileEdgePreview(chunks: BinaryArray, color: RGBA) {
  const target = new PixelMap(chunks.length, 1)
  return renderImageEdgeChunks(target, 'N', chunks, color)
}

export function makeBitMaskFromWangTile(size: number, tile: WangTile<BinaryArray>) {
  const mask = new BitMask(size, size)
  renderImageEdgeChunks(mask, 'N', tile.edges.N, 1)
  renderImageEdgeChunks(mask, 'E', tile.edges.E, 1)
  renderImageEdgeChunks(mask, 'S', tile.edges.S, 1)
  renderImageEdgeChunks(mask, 'W', tile.edges.W, 1)
  return mask
}

export function renderImageEdgeChunks<T extends NodeDataTypeInstance>(
  target: T,
  edge: WangTileEdge,
  chunks: BinaryArray,
  value: ExtractNodeDataBaseType<T>,
) {
  const size = chunks.length

  if (edge === 'N' || edge === 'S') {
    if (target.width < size) {
      const msg = `BitMask width: ${target.width} is less than binary array length: ${chunks.length}`
      console.error(msg)
      throw new Error(msg)
    }
  } else {
    if (target.height < size) {
      const msg = `BitMask height: ${target.height} is less than binary array length: ${chunks.length}`
      console.error(msg)
      throw new Error(msg)
    }
  }

  chunks.forEach((v, i) => {
    if (v) target.setEdge(edge, value as any, i)
  })

  return target
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

const defaultColors: RGBA[] = [
  { r: 255, g: 0, b: 0, a: 255 / 2 },
  { r: 0, g: 255, b: 0, a: 255 / 2 },
  { r: 0, g: 0, b: 255, a: 255 / 2 },
  { r: 255, g: 255, b: 0, a: 255 / 2 },
]

export function makeWangTileEdgesPixelMap(size: number, tile: WangTile<number>, colors = defaultColors, padding = 1) {
  const pixelMap = new PixelMap(size, size)
  const nIndex = tile.edges.N
  const eIndex = tile.edges.E
  const sIndex = tile.edges.S
  const wIndex = tile.edges.W

  pixelMap.setEdgeNPadded(colors[nIndex], padding)
  pixelMap.setEdgeEPadded(colors[eIndex], padding)
  pixelMap.setEdgeSPadded(colors[sIndex], padding)
  pixelMap.setEdgeWPadded(colors[wIndex], padding)

  return pixelMap
}

type TilePixelMapRecords = Record<TileId, {
  tile: WangTile<number>,
  pixelMap: PixelMap
}>

type TileImageDataRefRecords = Record<TileId, {
  tile: WangTile<number>,
  imageDataRef: ImageDataRef
}>

export function make4EdgeWangTileImages(
  tileSize: Ref<number>,
  gridWidth: Ref<number>,
  gridHeight: Ref<number>,
) {
  const tileset = make4EdgeWangTileset()

  const cachedWangTileEdgeColorPixelMaps = computed((): TilePixelMapRecords => {
    return Object.fromEntries(tileset.tiles.map(tile => [
      tile.id, {
        tile,
        pixelMap: makeWangTileEdgesPixelMap(tileSize.value, tile),
      }],
    ))
  })

  const tilesetImageRefs = computed((): TileImageDataRefRecords => {
    return reactive(Object.fromEntries(
      tileset.tiles.map(tile => {
        return [
          tile.id, {
            tile,
            imageDataRef: imageDataRef(new ImageData(tileSize.value, tileSize.value)),
          },
        ]
      }),
    ))
  })

  const canvasWidth = computed(() => tileSize.value * gridWidth.value)
  const canvasHeight = computed(() => tileSize.value * gridHeight.value)
  const tileGridEdgeColorSketch = new Sketch(0, 0)
  watchEffect(() => tileGridEdgeColorSketch.setSize(
    canvasWidth.value,
    canvasHeight.value,
  ))

  const tileGrid = computed(() => makeWangGrid(gridWidth.value, gridHeight.value, tileset))

// draw colored tile edges
  watchEffect(() => {
    if (!tileGrid.value) return
    tileGrid.value.each((tx, ty, tile) => {
      if (!tile) return
      const pixelMap = cachedWangTileEdgeColorPixelMaps.value[tile.id].pixelMap
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

  return {
    canvasWidth,
    canvasHeight,
    tileset,
    tileGrid,
    tilesetImageRefs,
    tileGridEdgeColorSketch,
    cachedWangTileEdgeColorPixelMaps,
    tilePixelToGridPixel,
    gridPixelToTile,
    gridPixelToTilePixel,
  }
}