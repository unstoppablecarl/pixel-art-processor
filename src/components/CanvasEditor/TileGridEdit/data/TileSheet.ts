import { markRaw } from 'vue'

import type { Rect } from '../../../../lib/util/data/Rect.ts'
import {
  clearImageData,
  deserializeImageData,
  extractImageData,
  resizeImageData,
  type SerializedImageData,
  serializeImageData,
  writeImageData,
} from '../../../../lib/util/html-dom/ImageData.ts'
import {
  AxialEdgeWangTileset,
  deserializeAxialEdgeWangTileset,
  type SerializedAxialEdgeWangTileset,
  type TileId,
  type WangTile,
} from '../../../../lib/wang-tiles/WangTileset.ts'
import type { SelectionTileSheetRect, TileSheetSelection } from '../lib/TileSheetSelection.ts'

export type TileSheet = ReturnType<typeof makeTileSheet>

export type SerializedTileSheet = {
  tileSize: number,
  imageData: SerializedImageData,
  tileset: SerializedAxialEdgeWangTileset<number>
  tilesX: number,
  tilesY: number,
}

export function makeTileSheet(
  {
    imageData,
    tileSize,
    tilesX,
    tilesY,
    tileset,
  }: {
    imageData?: ImageData
    tileSize: number
    tilesX?: number
    tilesY?: number
    tileset: AxialEdgeWangTileset<number>
  }) {

  let dirty = false

  const tilesPerRow = tilesX ?? Math.ceil(Math.sqrt(tileset.tiles.length))
  const tilesPerCol = tilesY ?? Math.ceil(tileset.tiles.length / tilesPerRow)

  const width = tilesPerRow * tileSize
  const height = tilesPerCol * tileSize

  let img = imageData ?? new ImageData(width, height)
  let imgData = markRaw(img)

  function clearTileSheetRect(rect: Rect) {
    clearImageData(imgData, rect.x, rect.y, rect.w, rect.h)
  }

  function getTileRect(tileId: TileId): Rect {
    const { tileX, tileY } = getTileCoords(tileId)
    return {
      x: tileX * tileSize,
      y: tileY * tileSize,
      w: tileSize,
      h: tileSize,
    }
  }

  function getTileCoords(tileId: TileId) {
    const index = tileset.byId.get(tileId)!.index
    return {
      tileX: index % tilesPerRow,
      tileY: Math.floor(index / tilesPerRow),
    }
  }

  function tileLocalToSheet(tileId: TileId, tx: number, ty: number) {
    const rect = getTileRect(tileId)

    return { x: rect.x + tx, y: rect.y + ty }
  }

  function sheetToTileLocal(tileId: TileId, sheetX: number, sheetY: number) {
    // Get the tile’s position in the tile sheet grid
    const { tileX, tileY } = getTileCoords(tileId)

    const localX = sheetX - tileX * tileSize
    const localY = sheetY - tileY * tileSize

    return { x: localX, y: localY }
  }

  function each(cb: (tileX: number, tileY: number, tile: WangTile<number>) => void) {
    tileset.tiles.forEach((tile) => {
      const { tileX, tileY } = getTileCoords(tile.id)
      cb(tileX, tileY, tile)
    })
  }

  function extractTile(
    tileId: TileId,
    x = 0,
    y = 0,
    w = tileSize,
    h = tileSize,
  ): ImageData {
    const { x: tx, y: ty } = getTileRect(tileId)
    return extractImageData(
      imgData,
      tx + x,
      ty + y,
      w,
      h,
    )
  }

  function writeTile(tileId: TileId, src: ImageData) {
    const { x, y } = getTileRect(tileId)
    writeImageData(imgData, src, x, y)
    dirty = true
  }

  function resizeTileSize(newTileSize: number) {
    if (newTileSize === tileSize) return

    const oldTileSize = tileSize
    const tileCount = tileset.tiles.length

    // Phase 1: extract
    const extracted = new Array<ImageData>(tileCount)
    for (let index = 0; index < tileCount; index++) {
      const oldX = (index % tilesPerRow) * oldTileSize
      const oldY = Math.floor(index / tilesPerRow) * oldTileSize
      extracted[index] = extractImageData(imgData, oldX, oldY, oldTileSize, oldTileSize)
    }

    // Phase 2: resize
    const resized = extracted.map(tile =>
      resizeImageData(tile, newTileSize, newTileSize),
    )

    // Phase 3: write into new sheet
    const newWidth = tilesPerRow * newTileSize
    const newHeight = tilesPerCol * newTileSize
    const newSheet = new ImageData(newWidth, newHeight)

    for (let index = 0; index < tileCount; index++) {
      const newX = (index % tilesPerRow) * newTileSize
      const newY = Math.floor(index / tilesPerRow) * newTileSize
      writeImageData(newSheet, resized[index], newX, newY)
    }

    // Phase 4: commit
    tileSize = newTileSize
    imgData = markRaw(newSheet)
    dirty = true
  }

  function tileLocalRectToTileSheetRect(tileId: TileId, rect: Rect): SelectionTileSheetRect {
    const tile = tileset.byId.get(tileId)
    if (!tile) throw new Error('tileId not found: ' + tileId)

    // Clip to tile bounds
    const x1 = Math.max(0, rect.x)
    const y1 = Math.max(0, rect.y)
    const x2 = Math.min(tileSize, rect.x + rect.w)
    const y2 = Math.min(tileSize, rect.y + rect.h)

    const w = x2 - x1
    const h = y2 - y1
    if (w <= 0 || h <= 0) throw new Error('selection bounds has zero size')

    const { tileX, tileY } = getTileCoords(tileId)

    // Convert tile-local → tileSheet
    const sheetX = tileX * tileSize + x1
    const sheetY = tileY * tileSize + y1
    const bufferX = sheetX - rect.x
    const bufferY = sheetY - rect.y

    return {
      tileId,
      x: sheetX,
      y: sheetY,
      w,
      h,
      tileX: x1,
      tileY: y1,
      bufferX,
      bufferY,
      gridX: null,
      gridY: null,
    }
  }

  function tilePointInTileSheetSelection(
    tileId: TileId,
    tx: number,
    ty: number,
    selection: TileSheetSelection,
  ): boolean {
    const tile = tileset.byId.get(tileId)
    if (!tile) return false

    const { tileX, tileY } = getTileCoords(tileId)

    // Convert tile-local → tileSheet
    const sheetX = tileX * tileSize + tx
    const sheetY = tileY * tileSize + ty

    // Check against selection rects
    for (const r of selection.currentRects) {
      if (
        sheetX >= r.x &&
        sheetX < r.x + r.w &&
        sheetY >= r.y &&
        sheetY < r.y + r.h
      ) {
        return true
      }
    }

    return false
  }

  function serialize(): SerializedTileSheet {
    return {
      tileSize,
      imageData: serializeImageData(imgData),
      tileset: tileset.serialize(),
      tilesX: tilesPerRow,
      tilesY: tilesPerCol,
    }
  }

  return {
    tileset,
    get tileSize() {
      return tileSize
    },
    get tilesPerRow() {
      return tilesPerRow
    },
    get tilesPerCol() {
      return tilesPerCol
    },
    get imageData() {
      return imgData
    },

    get pixelWidth() {
      return tilesPerRow * tileSize
    },

    get pixelHeight() {
      return tilesPerCol * tileSize
    },

    markDirty: () => dirty = true,
    isDirty: () => dirty,
    clearDirty: () => dirty = false,
    getTileRect,
    tileLocalToSheet,
    sheetToTileLocal,
    extractTile,
    writeTile,
    resizeTileSize,
    getTileCoords,
    clearTileSheetRect,
    tileLocalRectToTileSheetRect,
    tilePointInTileSheetSelection,
    each,
    extractImageData(
      x = 0,
      y = 0,
      w = tileSize,
      h = tileSize,
    ): ImageData {
      return extractImageData(
        imgData,
        x,
        y,
        w,
        h,
      )
    },
    serialize,
  }
}

export function deserializeTileSheet(serialized: SerializedTileSheet): TileSheet {
  return makeTileSheet({
    tileSize: serialized.tileSize,
    tilesX: serialized.tilesX,
    tilesY: serialized.tilesY,
    tileset: deserializeAxialEdgeWangTileset(serialized.tileset),
    imageData: deserializeImageData(serialized.imageData),
  })
}
