import type { RectBounds } from '../../../lib/util/data/Bounds.ts'
import { writeImageData } from '../../../lib/util/html-dom/ImageData.ts'
import type { TileId } from '../../../lib/wang-tiles/WangTileset.ts'
import type { TileSheet } from '../data/TileSheet.ts'

export type TileSheetRect = {
  x: number,
  y: number,
  readonly w: number,
  readonly h: number,
  readonly tileId: TileId,

  // combines the TileSheetRects to form the selection in the shape displayed to the user
  // the coords are not in a specific space it just describes how the rects fit together to make a bigger rect
  readonly srcX: number,
  readonly srcY: number
}

export type TileSheetSelection = {
  // absolute tileSheet rects at extraction time
  readonly originalRects: TileSheetRect[],
  // absolute tileSheet rects after movement
  readonly currentRects: TileSheetRect[],
  // layout for drawing overlays
  readonly offsetX: number,
  readonly offsetY: number,

  readonly width: number,
  readonly height: number,

  readonly hasMoved: boolean,

  move(dx: number, dy: number): void,
  toPixels(tileSheet: TileSheet): ImageData
}

export function makeTileSheetSelection(rects: TileSheetRect[], bounds: RectBounds): TileSheetSelection {
  // Deep copies
  const originalRects = rects.map(r => ({ ...r }))
  const currentRects = rects.map(r => ({ ...r }))

  let offsetX = 0
  let offsetY = 0

  return {
    originalRects,
    currentRects,

    width: bounds.w,
    height: bounds.h,

    get offsetX() {
      return offsetX
    },
    get offsetY() {
      return offsetY
    },

    get hasMoved() {
      return offsetX !== 0 || offsetY !== 0
    },

    move(dx: number, dy: number) {
      offsetX += dx
      offsetY += dy

      for (let i = 0; i < currentRects.length; i++) {
        currentRects[i].x = originalRects[i].x + offsetX
        currentRects[i].y = originalRects[i].y + offsetY
      }
    },
    toPixels(tileSheet: TileSheet): ImageData {
      const out = new ImageData(bounds.w, bounds.h)
      for (const r of currentRects) {
        const src = tileSheet.extractTile(r.tileId, r.x, r.y, r.w, r.h)
        writeImageData(out, src, r.srcX, r.srcY)
      }

      return out
    },
  }
}