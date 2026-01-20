import { reactive, watch } from 'vue'
import type CanvasPaint from '../../components/CanvasPaint.vue'
import type { ExtractNodeDataBaseType, NodeDataTypeInstance } from '../node-data-types/_node-data-types.ts'
import { BitMask } from '../node-data-types/BitMask.ts'
import { PixelMap } from '../node-data-types/PixelMap.ts'
import type { Direction } from '../pipeline/_types.ts'
import type { RGBA } from '../util/html-dom/ImageData.ts'
import { makePrng } from '../util/prng.ts'
import { type BinaryArray, generateChunkedArray } from '../util/prng/binary-array-chunks.ts'
import { type TileId, type WangTile } from './WangTileset.ts'

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
  edge: Direction,
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

export const defaultColors: RGBA[] = [
  { r: 255, g: 0, b: 0, a: 255 / 2 },
  { r: 0, g: 255, b: 0, a: 255 / 2 },
  { r: 0, g: 0, b: 255, a: 255 / 2 },
  { r: 255, g: 255, b: 0, a: 255 / 2 },
]

// arrayIndexToColor()
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

export type TileCanvasItem = {
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  updateView: () => void
}

export function useTileCanvases() {
  const tilesetCanvases = reactive(new Map<string, TileCanvasItem>())

  function setCanvasPaintRef(comp: typeof CanvasPaint | null, tileId: TileId) {
    if (!comp) {
      tilesetCanvases.delete(tileId)
      return
    }
    if (tilesetCanvases.has(tileId)) return

    const registered = set(comp, tileId)
    if (!registered) {
      const stopWatch = watch(() => comp?.viewCanvasRef, (canvas) => {
        set(comp, canvas)
        queueMicrotask(() => stopWatch())
      })
    }
  }

  function set(comp: typeof CanvasPaint | null, tileId: TileId) {
    const canvas = comp?.viewCanvasRef

    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('cannot get canvas context')
      tilesetCanvases.set(tileId, { canvas, ctx, updateView: comp.updateView })
      return true
    }
    return false
  }

  return {
    tilesetCanvases,
    setCanvasPaintRef,
  }
}