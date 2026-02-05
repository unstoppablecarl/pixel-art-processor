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
    dirty = true
  }

  function getTileRect(tileId: TileId): Rect {
    const { sTileX, sTileY } = getTileCoords(tileId)
    return {
      x: sTileX * tileSize,
      y: sTileY * tileSize,
      w: tileSize,
      h: tileSize,
    }
  }

  function getTileCoords(tileId: TileId) {
    const index = tileset.byId.get(tileId)!.index
    return {
      sTileX: index % tilesPerRow,
      sTileY: Math.floor(index / tilesPerRow),
    }
  }

  function tileLocalToSheet(tileId: TileId, tx: number, ty: number) {
    const rect = getTileRect(tileId)

    return { x: rect.x + tx, y: rect.y + ty }
  }

  function sheetToTileLocal(tileId: TileId, sx: number, sy: number) {
    // Get the tile’s position in the tile sheet grid
    const { sTileX, sTileY } = getTileCoords(tileId)

    const localX = sx - sTileX * tileSize
    const localY = sy - sTileY * tileSize

    return { x: localX, y: localY }
  }

  function each(cb: (sTileX: number, sTileY: number, tile: WangTile<number>) => void) {
    tileset.tiles.forEach((tile) => {
      const { sTileX, sTileY } = getTileCoords(tile.id)
      cb(sTileX, sTileY, tile)
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

  function sheetPixelToTileId(sx: number, sy: number): TileId | null {
    if (sx < 0 || sy < 0) return null

    const tileX = Math.floor(sx / tileSize)
    const tileY = Math.floor(sy / tileSize)

    if (tileX < 0 || tileY < 0) return null
    if (tileX >= tilesPerRow) return null
    if (tileY >= tilesPerCol) return null

    const tileIndex = tileY * tilesPerRow + tileX
    const tile = tileset.tiles[tileIndex]
    return tile ? tile.id : null
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

  function extractSheetImageData(
    rect: Rect,
  ): ImageData
  function extractSheetImageData(
    x: number,
    y: number,
    w: number,
    h: number,
  ): ImageData
  function extractSheetImageData(
    _x: Rect | number,
    _y?: number,
    _w?: number,
    _h?: number,
  ): ImageData {
    const { x, y, w, h } = typeof _x === 'object'
      ? _x
      : { x: _x, y: _y!, w: _w!, h: _h! }

    return extractImageData(
      imgData,
      x,
      y,
      w,
      h,
    )
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
    each,
    sheetPixelToTileId,
    extractImageData: extractSheetImageData,
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
