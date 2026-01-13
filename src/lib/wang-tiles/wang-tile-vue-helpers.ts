import type { NodeDataTypeInstance } from '../node-data-types/_node-data-types.ts'
import { BitMask } from '../node-data-types/BitMask.ts'
import { PixelMap } from '../node-data-types/PixelMap.ts'
import type { RGBA } from '../util/ImageData.ts'
import { makePrng } from '../util/prng.ts'
import { type BinaryArray, generateChunkedArray } from '../util/prng/binary-array-chunks.ts'
import type { WangTile, WangTileEdge } from './WangTileset.ts'

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
  direction: WangTileEdge,
  chunks: BinaryArray,
  value: any,
) {
  const size = chunks.length

  if (direction === 'N' || direction === 'S') {
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

  const edges = {
    N: (i: number) => target.set(i, 0, value),
    E: (i: number) => target.set(size - 1, i, value),
    S: (i: number) => target.set(i, size - 1, value),
    W: (i: number) => target.set(0, i, value),
  }

  chunks.forEach((v, i) => {
    if (v) edges[direction](i)
  })

  return target
}