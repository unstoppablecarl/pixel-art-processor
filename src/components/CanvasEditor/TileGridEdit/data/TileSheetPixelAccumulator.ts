import type { Point } from '../../../../lib/node-data-types/BaseDataStructure.ts'
import { type BlendFn, getBlendAdapter } from '../../../../lib/util/html-dom/blit.ts'
import {
  type PixelBlend,
  type PixelColor,
  type RGBA,
  setImageDataPixelColors,
} from '../../../../lib/util/html-dom/ImageData.ts'
import type { TileId } from '../../../../lib/wang-tiles/WangTileset.ts'
import type { ProtoTileSheetPatch, TileRect, TileSheetPatch } from './TileSheetHistory.ts'
import type { TileSheet } from './TileSheet.ts'

export type TileSheetPixelAccumulator = ReturnType<typeof makeTileSheetPixelAccumulator>

export function makeTileSheetPixelAccumulator() {
  const pixelWrites = new Map<TileId, PixelColor[]>()
  const tileBlends = new Map<TileId, PixelBlend[]>()

  function addTile(tileId: TileId, tx: number, ty: number, color: RGBA) {
    let arr = pixelWrites.get(tileId)
    if (!arr) {
      arr = []
      pixelWrites.set(tileId, arr)
    }
    arr.push({ x: tx, y: ty, color })
  }

  function addTiles(tileId: TileId, pixels: PixelColor[]) {
    let arr = pixelWrites.get(tileId)
    if (!arr) {
      arr = []
      pixelWrites.set(tileId, arr)
    }
    for (let i = 0; i < pixels.length; i++) {
      arr.push(pixels[i])
    }
  }

  function addTilePixelsWithColor(tileId: TileId, points: Point[], color: RGBA) {
    let arr = pixelWrites.get(tileId)
    if (!arr) {
      arr = []
      pixelWrites.set(tileId, arr)
    }
    for (let i = 0; i < points.length; i++) {
      const p = points[i]
      arr.push({ x: p.x, y: p.y, color })
    }
  }

  function addTileBlend(tileId: TileId, tx: number, ty: number, color: RGBA, blend: BlendFn) {
    let arr = tileBlends.get(tileId)
    if (!arr) {
      arr = []
      tileBlends.set(tileId, arr)
    }
    arr.push({ x: tx, y: ty, color, blend })
  }

  function getRegions(): TileRect[] {
    const rects: TileRect[] = []

    // solids
    for (const [tileId, writes] of pixelWrites) {
      const len = writes.length
      if (len === 0) continue

      let w0 = writes[0]
      let minX = w0.x
      let minY = w0.y
      let maxX = w0.x
      let maxY = w0.y

      for (let i = 1; i < len; i++) {
        const w = writes[i]
        const x = w.x
        const y = w.y
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }

      rects.push({
        tileId,
        x: minX,
        y: minY,
        w: maxX - minX + 1,
        h: maxY - minY + 1,
      })
    }

    // blends
    for (const [tileId, blends] of tileBlends) {
      const len = blends.length
      if (len === 0) continue

      let b0 = blends[0]
      let minX = b0.x
      let minY = b0.y
      let maxX = b0.x
      let maxY = b0.y

      for (let i = 1; i < len; i++) {
        const b = blends[i]
        const x = b.x
        const y = b.y
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }

      rects.push({
        tileId,
        x: minX,
        y: minY,
        w: maxX - minX + 1,
        h: maxY - minY + 1,
      })
    }

    return rects
  }

  function apply(tileSheet: TileSheet) {
    const img = tileSheet.imageData

    // reused offset
    const off = { x: 0, y: 0 }
    // scratch buffer reused for all pixels
    const scratchSrc = new Uint8ClampedArray(4)

    // 1. Apply solid writes
    for (const [tileId, writes] of pixelWrites) {
      const len = writes.length
      if (len === 0) continue
      const offset = tileSheet.getTileSheetOffset(tileId, off)

      const sheetPts = new Array<{ x: number; y: number; color: RGBA }>(len)

      for (let i = 0; i < len; i++) {
        const w = writes[i]
        const sx = offset.x + w.x
        const sy = offset.y + w.y
        sheetPts[i] = { x: sx, y: sy, color: w.color }
      }

      setImageDataPixelColors(img, sheetPts)
    }

    // 2. Apply blend writes (byte-level, no per-pixel allocations)
    for (const [tileId, blends] of tileBlends) {
      const len = blends.length
      if (len === 0) continue
      const offset = tileSheet.getTileSheetOffset(tileId, off)

      for (let i = 0; i < len; i++) {
        const b = blends[i]
        const sx = offset.x + b.x
        const sy = offset.y + b.y
        const di = (sy * img.width + sx) * 4

        // create adapter once per blendFn per pixel
        const byteBlend = getBlendAdapter(b.blend)

        scratchSrc[0] = b.color.r
        scratchSrc[1] = b.color.g
        scratchSrc[2] = b.color.b
        scratchSrc[3] = b.color.a

        byteBlend(scratchSrc, img.data, 0, di)
      }
    }
  }

  function affectedTileIds(): TileId[] {
    const ids = new Set<TileId>()

    for (const id of pixelWrites.keys()) ids.add(id)
    for (const id of tileBlends.keys()) ids.add(id)

    return [...ids]
  }

  function toPatches(tileSheet: TileSheet): ProtoTileSheetPatch[] {
    const patches: ProtoTileSheetPatch[] = []
    const img = tileSheet.imageData

    // merge writes + blends into one region set
    const rects = getRegions()

    for (let i = 0; i < rects.length; i++) {
      const r = rects[i]
      const offset = tileSheet.getTileSheetOffset(r.tileId)

      const sx = offset.x + r.x
      const sy = offset.y + r.y

      const before = new Uint8ClampedArray(r.w * r.h * 4)

      // extract BEFORE pixels
      for (let y = 0; y < r.h; y++) {
        for (let x = 0; x < r.w; x++) {
          const di = ((sy + y) * img.width + (sx + x)) * 4
          const si = (y * r.w + x) * 4

          before[si] = img.data[di]
          before[si + 1] = img.data[di + 1]
          before[si + 2] = img.data[di + 2]
          before[si + 3] = img.data[di + 3]
        }
      }

      patches.push({
        tileId: r.tileId,
        x: r.x,
        y: r.y,
        w: r.w,
        h: r.h,
        before,
        after: null,
      })
    }

    return patches
  }

  function finalizePatches(tileSheet: TileSheet, patches: ProtoTileSheetPatch[]): TileSheetPatch[] {
    const img = tileSheet.imageData

    for (let i = 0; i < patches.length; i++) {
      const p = patches[i]
      const offset = tileSheet.getTileSheetOffset(p.tileId)

      const sx = offset.x + p.x
      const sy = offset.y + p.y

      const after = new Uint8ClampedArray(p.w * p.h * 4)

      // extract AFTER pixels
      for (let y = 0; y < p.h; y++) {
        for (let x = 0; x < p.w; x++) {
          const di = ((sy + y) * img.width + (sx + x)) * 4
          const si = (y * p.w + x) * 4

          after[si] = img.data[di]
          after[si + 1] = img.data[di + 1]
          after[si + 2] = img.data[di + 2]
          after[si + 3] = img.data[di + 3]
        }
      }

      p.after = after
    }

    return patches as TileSheetPatch[]
  }

  function reset() {
    pixelWrites.clear()
    tileBlends.clear()
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
    addTileBlend,
  }
}