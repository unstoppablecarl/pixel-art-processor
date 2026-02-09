import { type Point } from '../../../../lib/node-data-types/BaseDataStructure.ts'
import { blendOverwrite, getBlendAdapter } from '../../../../lib/util/html-dom/blit.ts'
import { type PixelColor, type RGBA } from '../../../../lib/util/html-dom/ImageData.ts'
import type { TileId } from '../../../../lib/wang-tiles/WangTileset.ts'
import { finalizePatch } from '../../_support/data/_history-helpers.ts'
import type { TileSheet } from './TileSheet.ts'
import type { ProtoTileSheetPatch, TileRect, TileSheetPatch } from './TileSheetHistory.ts'

export type TileSheetPixelAccumulator = ReturnType<typeof makeTileSheetPixelAccumulator>

// Internal type for the buffer entry
type TileBuffer = {
  data: Uint32Array
  count: number
}
// written for perf over readability
export function makeTileSheetPixelAccumulator() {
  const tileBuffers = new Map<TileId, TileBuffer>()
  const blendRegistry: any[] = []

  // Helper to manage blend function indices
  function getBlendIdx(fn: any): number {
    let idx = blendRegistry.indexOf(fn)
    if (idx === -1) idx = blendRegistry.push(fn) - 1
    return idx
  }

  function ensureBuffer(tileId: TileId): TileBuffer {
    let buf = tileBuffers.get(tileId)
    if (!buf) {
      buf = { data: new Uint32Array(256 * 4), count: 0 }
      tileBuffers.set(tileId, buf)
    }
    if (buf.count * 4 >= buf.data.length) {
      const next = new Uint32Array(buf.data.length * 2)
      next.set(buf.data)
      buf.data = next
    }
    return buf
  }

  function addTile(tileId: TileId, tx: number, ty: number, color: RGBA, blend = blendOverwrite, isPropagated = false) {
    const buf = ensureBuffer(tileId)
    const idx = buf.count * 4
    const d = buf.data

    d[idx] = (tx << 16) | ty
    d[idx + 1] = (color.r << 24) | (color.g << 16) | (color.b << 8) | (color.a >>> 0)
    d[idx + 2] = getBlendIdx(blend)
    d[idx + 3] = isPropagated ? 1 : 0
    buf.count++
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

  function getRawBufferForTile(tileId: TileId) {
    return tileBuffers.get(tileId)
  }

  function getRegions(): TileRect[] {
    const rects: TileRect[] = []
    for (const [tileId, buf] of tileBuffers) {
      if (buf.count === 0) continue
      const d = buf.data
      let c0 = d[0]
      let minX = c0 >> 16, maxX = minX
      let minY = c0 & 0xFFFF, maxY = minY

      for (let i = 1; i < buf.count; i++) {
        const coords = d[i * 4]
        const x = coords >> 16
        const y = coords & 0xFFFF
        if (x < minX) {
          minX = x
        } else if (x > maxX) {
          maxX = x
        }
        if (y < minY) {
          minY = y
        } else if (y > maxY) {
          maxY = y
        }
      }
      rects.push({ tileId, x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 })
    }
    return rects
  }

  function apply(tileSheet: TileSheet) {
    const img = tileSheet.imageData
    const data = img.data
    const width = img.width
    const off = { x: 0, y: 0 }
    const scratchSrc = new Uint8ClampedArray(4)

    for (const [tileId, buf] of tileBuffers) {
      if (buf.count === 0) continue
      const offset = tileSheet.getTileSheetOffset(tileId, off)
      const d = buf.data

      for (let i = 0; i < buf.count; i++) {
        const ptr = i * 4
        const coords = d[ptr]
        const rgba = d[ptr + 1]
        const sx = offset.x + (coords >> 16)
        const sy = offset.y + (coords & 0xFFFF)
        const di = (sy * width + sx) * 4

        scratchSrc[0] = (rgba >> 24) & 0xFF
        scratchSrc[1] = (rgba >> 16) & 0xFF
        scratchSrc[2] = (rgba >> 8) & 0xFF
        scratchSrc[3] = rgba & 0xFF

        getBlendAdapter(blendRegistry[d[ptr + 2]])(scratchSrc, data, 0, di)
      }
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
      const sx = offset.x + r.x
      const sy = offset.y + r.y
      const before = new Uint8ClampedArray(r.w * r.h * 4)

      for (let y = 0; y < r.h; y++) {
        const rowStart = (sy + y) * img.width
        for (let x = 0; x < r.w; x++) {
          const di = (rowStart + (sx + x)) * 4
          const si = (y * r.w + x) * 4
          before[si] = img.data[di]
          before[si + 1] = img.data[di + 1]
          before[si + 2] = img.data[di + 2]
          before[si + 3] = img.data[di + 3]
        }
      }

      patches.push({ tileId: r.tileId, x: r.x, y: r.y, w: r.w, h: r.h, before, after: null })
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
    addTiles,
    addTilePixelsWithColor,
    getRawBufferForTile,
    getBlendAtIdx: (idx: number) => blendRegistry[idx],
  }
}