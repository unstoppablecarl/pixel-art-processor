// TileGridGeometry.ts
import type { Rect } from '../../../../lib/util/data/Rect.ts'
import type { AxialEdgeWangGrid } from '../../../../lib/wang-tiles/WangGrid.ts'
import type { GridSelectionRect, TileAlignedRect, SheetAlignedRect } from '../lib/ISelection.ts'
import type { TileSheet } from './TileSheet.ts'

export type TileGridGeometry = ReturnType<typeof makeTileGridGeometry>

export function makeTileGridGeometry(
  tileGrid: AxialEdgeWangGrid<number>,
  tileSheet: TileSheet,
  tileSize: number,
) {
  function gridPixelToGridTile(gx: number, gy: number) {
    const gTileX = Math.floor(gx / tileSize)
    const gTileY = Math.floor(gy / tileSize)
    const tile = tileGrid.get(gTileX, gTileY)
    if (!tile) return null
    return { gTileX, gTileY, tile }
  }

  function gridPixelToTilePixel(gx: number, gy: number) {
    const hit = gridPixelToGridTile(gx, gy)
    if (!hit) return null
    const { gTileX, gTileY, tile } = hit
    const tx = gx - gTileX * tileSize
    const ty = gy - gTileY * tileSize
    return { tileId: tile.id, tx, ty }
  }

  function gridPixelToSheetPixel(gx: number, gy: number) {
    const hit = gridPixelToTilePixel(gx, gy)
    if (!hit) return null
    const { tileId, tx, ty } = hit
    const { x, y } = tileSheet.tileLocalToSheet(tileId, tx, ty)
    return { tileId, tx, ty, x, y }
  }

  function gridTileToGridPixel(gTileX: number, gTileY: number, tx = 0, ty = 0) {
    return {
      gx: gTileX * tileSize + tx,
      gy: gTileY * tileSize + ty,
    }
  }

  function gridRectsToTileAlignedRects(
    rects: GridSelectionRect[],
  ): TileAlignedRect[] {
    const out: TileAlignedRect[] = []

    for (const r of rects) {
      const overlaps = tileGrid.getOverlappingTiles(
        { x: r.x, y: r.y, w: r.w, h: r.h },
        tileSize,
      )

      for (const o of overlaps) {
        const { tile, tileOverlap } = o
        const { w, h } = tileOverlap
        if (w <= 0 || h <= 0) continue

        const mask = sliceMask(r.mask, o.sourceX, o.sourceY, w, h, r.w)

        out.push({
          tileId: tile.id,
          selectionX: o.sourceX,
          selectionY: o.sourceY,
          w,
          h,
          bufferX: o.sourceX,
          bufferY: o.sourceY,
          mask,
        })
      }
    }

    return out
  }

  function tileAlignedRectToSheetRect(r: TileAlignedRect): SheetAlignedRect {
    const tileRect = tileSheet.getTileRect(r.tileId)

    return {
      x: tileRect.x + r.selectionX,
      y: tileRect.y + r.selectionY,
      w: r.w,
      h: r.h,
      bufferX: r.bufferX,
      bufferY: r.bufferY,
      mask: r.mask,
    }
  }

  function tileAlignedRectToGridRects(rect: TileAlignedRect): GridSelectionRect[] {
    const { tileId, selectionX, selectionY, w, h, mask } = rect
    const results: GridSelectionRect[] = []

    tileGrid.mapWithTileId(tileId, (gTileX, gTileY) => {
      const x = gTileX * tileSize + selectionX
      const y = gTileY * tileSize + selectionY

      results.push({
        x,
        y,
        w,
        h,
        mask,
      })
    })

    return results
  }

  function splitGridMaskForRects(
    floodMask: Uint8Array,
    floodRect: Rect,
    rects: SheetAlignedRect[],
  ): Uint8Array[] {
    const masks = rects.map(r => new Uint8Array(r.w * r.h))
    const { x: fx0, y: fy0, w: fw, h: fh } = floodRect

    for (let iy = 0; iy < fh; iy++) {
      for (let ix = 0; ix < fw; ix++) {
        const maskVal = floodMask[iy * fw + ix]
        if (maskVal === 0) continue

        const gridX = fx0 + ix
        const gridY = fy0 + iy

        const sheetHit = gridPixelToSheetPixel(gridX, gridY)
        if (!sheetHit) continue

        const { x: sheetX, y: sheetY } = sheetHit

        for (let rIndex = 0; rIndex < rects.length; rIndex++) {
          const r = rects[rIndex]

          if (
            sheetX < r.x || sheetY < r.y ||
            sheetX >= r.x + r.w || sheetY >= r.y + r.h
          ) continue

          const localX = sheetX - r.x
          const localY = sheetY - r.y
          const mi = localY * r.w + localX
          masks[rIndex][mi] = maskVal
        }
      }
    }

    return masks
  }

  function splitSheetMaskForRects(
    mask: Uint8Array,
    bounds: Rect,
    rects: SheetAlignedRect[],
  ): Uint8Array[] {
    const { x: bx, y: by, w: bw } = bounds

    return rects.map(r => {
      const out = new Uint8Array(r.w * r.h)

      for (let dy = 0; dy < r.h; dy++) {
        for (let dx = 0; dx < r.w; dx++) {
          const sx = r.x + dx
          const sy = r.y + dy

          const mx = sx - bx
          const my = sy - by

          const maskIndex = my * bw + mx
          const outIndex = dy * r.w + dx

          out[outIndex] = mask[maskIndex]
        }
      }

      return out
    })
  }

  function validateTileAlignedRect(
    r: TileAlignedRect,
    bufferWidth: number,
    bufferHeight: number,
  ) {
    const errors: string[] = []

    if (r.w <= 0 || r.h <= 0)
      errors.push(`Invalid size: w=${r.w}, h=${r.h}`)

    if (r.selectionX < 0 || r.selectionY < 0)
      errors.push(`selectionX/selectionY must be >= 0`)

    if (r.selectionX + r.w > tileSize)
      errors.push(`Rect overhangs tile horizontally`)

    if (r.selectionY + r.h > tileSize)
      errors.push(`Rect overhangs tile vertically`)

    if (r.bufferX < 0 || r.bufferY < 0)
      errors.push(`bufferX/bufferY must be >= 0`)

    if (r.bufferX + r.w > bufferWidth)
      errors.push(`Rect overhangs buffer horizontally`)

    if (r.bufferY + r.h > bufferHeight)
      errors.push(`Rect overhangs buffer vertically`)

    if (r.mask && r.mask.length !== r.w * r.h)
      errors.push(`Mask length mismatch`)

    if (errors.length)
      throw new Error(errors.join('\n'))
  }

  function getOverlappingTilesOnGrid(rect: Rect) {
    return tileGrid.getOverlappingTiles(rect, tileSize)
  }

  return {
    tileSheet,
    tileAlignedRectToGridRects,
    tileAlignedRectToSheetRect,
    gridRectsToTileAlignedRects,
    splitSheetMaskForRects,
    splitGridMaskForRects,
    gridPixelToGridTile,
    gridPixelToTilePixel,
    gridPixelToSheetPixel,
    gridTileToGridPixel,
    getOverlappingTilesOnGrid,
    validateTileAlignedRect,
    sheetPixelToTileId: tileSheet.sheetPixelToTileId,
    tileLocalToSheet: tileSheet.tileLocalToSheet,
  }
}

function sliceMask(
  mask: Uint8Array | null,
  srcX: number,
  srcY: number,
  w: number,
  h: number,
  stride: number,
): Uint8Array | null {
  if (!mask) return null
  const out = new Uint8Array(w * h)

  for (let row = 0; row < h; row++) {
    const srcRow = (srcY + row) * stride + srcX
    const dstRow = row * w
    out.set(mask.subarray(srcRow, srcRow + w), dstRow)
  }

  return out
}
