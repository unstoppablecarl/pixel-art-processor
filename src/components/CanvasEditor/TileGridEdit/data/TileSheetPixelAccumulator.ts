import { type Point } from '../../../../lib/node-data-types/BaseDataStructure.ts'
import type { PixelColor, RGBA } from '../../../../lib/util/color.ts'
import {
  applyBufferToImageData, extractPixelData,
  growBufferIfNeeded,
  type PixelBuffer,
  pixelBufferToRect,
} from '../../../../lib/util/data/pixel-buffer.ts'
import { blendOverwrite } from '../../../../lib/util/html-dom/blit.ts'
import type { TileId } from '../../../../lib/wang-tiles/WangTileset.ts'
import { finalizePatch } from '../../_core/data/_history-helpers.ts'
import type { TileSheet } from './TileSheet.ts'
import type { ProtoTileSheetPatch, TileRect, TileSheetPatch } from './TileSheetHistory.ts'

export type TileSheetPixelAccumulator = ReturnType<typeof makeTileSheetPixelAccumulator>

// written for perf over readability
export function makeTileSheetPixelAccumulator() {
  const STRIDE = 4
  const tileBuffers = new Map<TileId, PixelBuffer>()
  const blendRegistry: any[] = []

  // Helper to manage blend function indices
  function getBlendIdx(fn: any): number {
    let idx = blendRegistry.indexOf(fn)
    if (idx === -1) idx = blendRegistry.push(fn) - 1
    return idx
  }

  function ensureBuffer(tileId: TileId): PixelBuffer {
    let buf = tileBuffers.get(tileId)
    if (!buf) {
      // Keep initial allocation but remove the growth check here
      buf = { data: new Uint32Array(256 * STRIDE), count: 0 }
      tileBuffers.set(tileId, buf)
    }
    return buf
  }

  function addTile(tileId: TileId, tx: number, ty: number, color: RGBA, blend = blendOverwrite, isPropagated = false) {
    const packed = (color.r << 24) | (color.g << 16) | (color.b << 8) | (color.a >>> 0)
    addTilePacked(tileId, tx, ty, packed, blend, isPropagated)
  }

  function addTiles(tileId: TileId, pixels: PixelColor[], blend = blendOverwrite, isPropagated = false) {
    for (let i = 0; i < pixels.length; i++) {
      const p = pixels[i]
      addTile(tileId, p.x, p.y, p.color, blend, isPropagated)
    }
  }

  function addTilePixelsWithColor(tileId: TileId, points: Point[], color: RGBA, blend = blendOverwrite, isPropagated = false) {
    for (let i = 0; i < points.length; i++) {
      const p = points[i]
      addTile(tileId, p.x, p.y, color, blend, isPropagated)
    }
  }

  /**
   * Adds a pixel using a pre-packed 32-bit color integer.
   * This is the high-performance path for bulk image operations.
   */
  function addTilePacked(
    tileId: TileId,
    tx: number,
    ty: number,
    packedColor: number,
    blend = blendOverwrite,
    isPropagated = false,
  ) {
    const buf = ensureBuffer(tileId)
    growBufferIfNeeded(buf, STRIDE)
    const offset = buf.count * STRIDE

    buf.data[offset] = (tx << 16) | ty
    buf.data[offset + 1] = packedColor
    buf.data[offset + 2] = getBlendIdx(blend)
    buf.data[offset + 3] = isPropagated ? 1 : 0
    buf.count++
  }

  function getRawBufferForTile(tileId: TileId) {
    return tileBuffers.get(tileId)
  }

  function getRegions(): TileRect[] {
    const rects: TileRect[] = []
    for (const [tileId, buf] of tileBuffers) {
      const rect = pixelBufferToRect(buf, STRIDE)
      if (!rect) continue
      rects.push({ tileId, x: rect.x, y: rect.y, w: rect.w, h: rect.h })
    }
    return rects
  }

  const OFF = { x: 0, y: 0 }

  function apply(tileSheet: TileSheet) {
    // reuse off obj
    for (const [tileId, buf] of tileBuffers) {
      const offset = tileSheet.getTileSheetOffset(tileId, OFF)
      applyBufferToImageData(buf, tileSheet.imageData, blendRegistry, STRIDE, offset.x, offset.y)
    }
  }

  function affectedTileIds(): TileId[] {
    return Array.from(tileBuffers.keys())
  }

  function toPatches(tileSheet: TileSheet): ProtoTileSheetPatch[] {
    const patches: ProtoTileSheetPatch[] = []
    const img = tileSheet.imageData
    const rects = getRegions()

    for (let i = 0; i < rects.length; i++) {
      const r = rects[i]
      const offset = tileSheet.getTileSheetOffset(r.tileId)

      // sx/sy are the absolute positions on the Sheet
      const sx = offset.x + r.x
      const sy = offset.y + r.y

      // Use the generic extractor
      const before = extractPixelData(img, { x: sx, y: sy, w: r.w, h: r.h })

      patches.push({
        tileId: r.tileId,
        x: r.x, y: r.y, w: r.w, h: r.h,
        before,
        after: null
      })
    }
    return patches
  }

  function finalizePatches(tileSheet: TileSheet, patches: ProtoTileSheetPatch[]): TileSheetPatch[] {
    const img = tileSheet.imageData
    for (let i = 0; i < patches.length; i++) {
      const p = patches[i]
      const offset = tileSheet.getTileSheetOffset(p.tileId)
      finalizePatch(p, img, offset.x, offset.y)
    }
    return patches as TileSheetPatch[]
  }

  function reset() {
    tileBuffers.clear()
    blendRegistry.length = 0
  }

  return {
    reset,
    toPatches,
    finalizePatches,
    getRegions,
    apply,
    affectedTileIds,
    addTile,
    addTilePacked,
    addTiles,
    addTilePixelsWithColor,
    getRawBufferForTile,
    getBlendAtIdx: (idx: number) => blendRegistry[idx],
  }
}