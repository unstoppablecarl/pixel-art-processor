import {
  type Color32,
  forEachLinePoint,
  type PaintAlphaMask,
  type PaintBinaryMask,
  type PaintRect,
} from 'pixel-data-js'
import type { TileId } from '../../../lib/wang-tiles/WangTileset.ts'
import type { TileSheetPaintBuffer } from './TileSheetPaintBuffer.ts'

export class TileToTileSheetPaintBuffer {

  constructor(
    public tileSheetPaintBuffer: TileSheetPaintBuffer,
  ) {

  }

  paintAlphaMask(tileId: TileId, color: Color32, brush: PaintAlphaMask, x: number, y: number): boolean
  paintAlphaMask(tileId: TileId, color: Color32, brush: PaintAlphaMask, startX: number, startY: number, endX: number, endY: number): boolean
  paintAlphaMask(
    tileId: TileId,
    color: Color32,
    brush: PaintAlphaMask,
    x0: number,
    y0: number,
    x1: number = x0,
    y1: number = y0,
  ): boolean {
    const cA = color >>> 24
    if (cA === 0) return false

    const tile = this.tileSheetPaintBuffer.get(tileId)
    const targetW = tile.w
    const targetH = tile.h

    const { w: maskW, h: maskH, data: maskData, centerOffsetX, centerOffsetY } = brush
    const cRGB = color & 0x00ffffff
    const dst32 = tile.data

    let hasChanged = false

    forEachLinePoint(x0, y0, x1, y1, (px, py) => {
      const topLeftX = Math.floor(px + centerOffsetX)
      const topLeftY = Math.floor(py + centerOffsetY)

      let dstX = topLeftX
      let dstY = topLeftY
      let actualW = maskW
      let actualH = maskH

      if (dstX < 0) {
        actualW += dstX
        dstX = 0
      }

      if (dstY < 0) {
        actualH += dstY
        dstY = 0
      }

      actualW = Math.min(actualW, targetW - dstX)
      actualH = Math.min(actualH, targetH - dstY)

      if (actualW <= 0 || actualH <= 0) return

      // Calculate offsets for the mask based on clipping
      const mx = dstX - topLeftX
      const my = dstY - topLeftY

      // Stride-based loop for performance
      let dIdx = dstY * targetW + dstX
      let mIdx = my * maskW + mx

      const dStride = targetW - actualW
      const mStride = maskW - actualW

      for (let iy = 0; iy < actualH; iy++) {
        for (let ix = 0; ix < actualW; ix++) {
          const brushA = maskData[mIdx]
          if (brushA !== 0) {
            const t = cA * brushA + 128
            const blendedA = (t + (t >> 8)) >> 8
            const cur = dst32[dIdx]
            if (brushA > (cur >>> 24)) {
              const next = (cRGB | (blendedA << 24)) >>> 0
              if (cur !== next) {
                dst32[dIdx] = next as Color32
                hasChanged = true
              }
            }
          }
          dIdx++
          mIdx++
        }
        dIdx += dStride
        mIdx += mStride
      }
    })

    return hasChanged
  }

  paintBinaryMask(tileId: TileId, color: Color32, brush: PaintBinaryMask, x: number, y: number): boolean
  paintBinaryMask(tileId: TileId, color: Color32, brush: PaintBinaryMask, startX: number, startY: number, endX: number, endY: number): boolean
  paintBinaryMask(
    tileId: TileId,
    color: Color32,
    brush: PaintBinaryMask,
    x0: number,
    y0: number,
    x1: number = x0,
    y1: number = y0,
  ): boolean {
    if ((color >>> 24) === 0) return false

    const tile = this.tileSheetPaintBuffer.get(tileId)
    const targetW = tile.w
    const targetH = tile.h

    const { w: maskW, h: maskH, data: maskData, centerOffsetX, centerOffsetY } = brush
    const dst32 = tile.data

    let hasChanged = false

    forEachLinePoint(x0, y0, x1, y1, (px, py) => {
      const topLeftX = Math.floor(px + centerOffsetX)
      const topLeftY = Math.floor(py + centerOffsetY)

      let dstX = topLeftX
      let dstY = topLeftY
      let actualW = maskW
      let actualH = maskH

      if (dstX < 0) {
        actualW += dstX
        dstX = 0
      }

      if (dstY < 0) {
        actualH += dstY
        dstY = 0
      }

      actualW = Math.min(actualW, targetW - dstX)
      actualH = Math.min(actualH, targetH - dstY)

      if (actualW <= 0 || actualH <= 0) return

      // Calculate offsets for the mask based on clipping
      const mx = dstX - topLeftX
      const my = dstY - topLeftY

      // Stride-based loop for performance
      let dIdx = dstY * targetW + dstX
      let mIdx = my * maskW + mx

      const dStride = targetW - actualW
      const mStride = maskW - actualW

      for (let iy = 0; iy < actualH; iy++) {
        for (let ix = 0; ix < actualW; ix++) {
          const brushA = maskData[mIdx]
          if (brushA === 1) {
            if (dst32[dIdx] !== color) {
              dst32[dIdx] = color
              hasChanged = true
            }
          }
          dIdx++
          mIdx++
        }
        dIdx += dStride
        mIdx += mStride
      }
    })

    return hasChanged
  }

  paintRect(tileId: TileId, color: Color32, brush: PaintRect, x: number, y: number): boolean
  paintRect(tileId: TileId, color: Color32, brush: PaintRect, startX: number, startY: number, endX: number, endY: number): boolean
  paintRect(
    tileId: TileId,
    color: Color32,
    brush: PaintRect,
    x0: number,
    y0: number,
    x1: number = x0,
    y1: number = y0,
  ): boolean {
    if ((color >>> 24) === 0) return false

    const tile = this.tileSheetPaintBuffer.get(tileId)
    const targetW = tile.w
    const targetH = tile.h

    const { w: maskW, h: maskH, centerOffsetX, centerOffsetY } = brush
    const dst32 = tile.data

    let hasChanged = false

    forEachLinePoint(x0, y0, x1, y1, (px, py) => {
      const topLeftX = Math.floor(px + centerOffsetX)
      const topLeftY = Math.floor(py + centerOffsetY)

      let dstX = topLeftX
      let dstY = topLeftY
      let actualW = maskW
      let actualH = maskH

      if (dstX < 0) {
        actualW += dstX
        dstX = 0
      }

      if (dstY < 0) {
        actualH += dstY
        dstY = 0
      }

      actualW = Math.min(actualW, targetW - dstX)
      actualH = Math.min(actualH, targetH - dstY)

      if (actualW <= 0 || actualH <= 0) return

      // Stride-based loop for performance
      let dIdx = dstY * targetW + dstX

      const dStride = targetW - actualW

      for (let iy = 0; iy < actualH; iy++) {
        for (let ix = 0; ix < actualW; ix++) {
          if (dst32[dIdx] !== color) {
            dst32[dIdx] = color
            hasChanged = true
          }

          dIdx++
        }
        dIdx += dStride
      }
    })

    return hasChanged
  }
}