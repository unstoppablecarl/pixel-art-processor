import { BitMask } from '../step-data-types/BitMask.ts'
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

export function wangTileEdgePreview(chunks: BinaryArray) {
  const mask = new BitMask(chunks.length, 1)
  return renderBitMaskEdgeChunks(mask, 'N', chunks)
}

export function makeBitMaskFromWangTile(size: number, tile: WangTile<BinaryArray>) {
  const mask = new BitMask(size, size)
  renderBitMaskEdgeChunks(mask, 'N', tile.edges.N)
  renderBitMaskEdgeChunks(mask, 'E', tile.edges.E)
  renderBitMaskEdgeChunks(mask, 'S', tile.edges.S)
  renderBitMaskEdgeChunks(mask, 'W', tile.edges.W)
  return mask
}

export function renderBitMaskEdgeChunks(
  mask: BitMask,
  direction: WangTileEdge,
  chunks: BinaryArray,
) {
  const size = chunks.length

  if (direction === 'N' || direction === 'S') {
    if (mask.width < size) {
      const msg = `BitMask width: ${mask.width} is less than binary array length: ${chunks.length}`
      console.error(msg)
      throw new Error(msg)
    }
  } else {
    if (mask.height < size) {
      const msg = `BitMask height: ${mask.height} is less than binary array length: ${chunks.length}`
      console.error(msg)
      throw new Error(msg)
    }
  }

  const edges = {
    N: (i: number) => mask.set(i, 0, 1),
    E: (i: number) => mask.set(size - 1, i, 1),
    S: (i: number) => mask.set(i, size - 1, 1),
    W: (i: number) => mask.set(0, i, 1),
  }

  chunks.forEach((v, i) => {
    if (v) edges[direction](i)
  })

  return mask
}