import { BitMask } from '../step-data-types/BitMask.ts'
import { prng } from '../util/prng.ts'
import type { BinaryArray } from '../util/prng/binary-array-chunks.ts'

export function makeWangTileConfigDefaults() {
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
  }
}

export type WangTileColorConfig = ReturnType<typeof makeWangTileConfigDefaults>

export function generateWangTileEdgePattern(size: number, c: WangTileColorConfig): BinaryArray {
  const chunks = prng.generateChunkedBinaryArray({
    chunks: c.chunks,
    shuffleSeed: c.shuffleSeed,
    length: size,
    minGapSize: c.minGapSize,
    maxGapSize: c.maxGapSize,
    minChunkSize: c.minChunkSize,
    maxChunkSize: c.maxChunkSize,
    padding: c.padding,
  })

  if (c.invert) {
    chunks.forEach((v, i) => {
      chunks[i] = !v ? 1 : 0
    })
  }

  return chunks as BinaryArray
}

export function wangTileEdgeRenderer(
  mask: BitMask,
  direction: number,
  chunks: BinaryArray,
) {
  const size = chunks.length
  const edgeSetters = {
    setTopEdge: (i: number) => mask.set(i, 0, 1),
    setRightEdge: (i: number) => mask.set(size - 1, i, 1),
    setBottomEdge: (i: number) => mask.set(i, size - 1, 1),
    setLeftEdge: (i: number) => mask.set(0, i, 1),
  }

  const edges = Object.values(edgeSetters)

  chunks.forEach((v, i) => {
    edges[direction](i)
  })

  return mask
}