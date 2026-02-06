import { markRaw } from 'vue'
import type { Point } from '../../../../lib/node-data-types/BaseDataStructure.ts'

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
import { applyHistoryPixels, extractHistoryPixels } from '../history/_history-helpers.ts'

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
  const tileCount = tileset.tiles.length
  const tileVersions = new Uint32Array(tileCount)

  let currentVersion = 0

  function markAllTilesDirty() {
    currentVersion++
    for (let i = 0; i < tileCount; i++) {
      tileVersions[i]++
    }
  }

  markAllTilesDirty()

  const tilesPerRow = tilesX ?? Math.ceil(Math.sqrt(tileset.tiles.length))
  const tilesPerCol = tilesY ?? Math.ceil(tileset.tiles.length / tilesPerRow)

  const width = tilesPerRow * tileSize
  const height = tilesPerCol * tileSize

  let img = imageData ?? new ImageData(width, height)
  let imgData = markRaw(img)

  // fast path
  function getTileSheetOffset(tileId: TileId, out: Point = { x: 0, y: 0 }): Point {
    const index = tileset.byId.get(tileId)!.index
    out.x = (index % tilesPerRow) * tileSize
    out.y = (Math.floor(index / tilesPerRow)) * tileSize
    return out
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
    sx = 0,
    sy = 0,
    w = tileSize,
    h = tileSize,
  ): ImageData {
    const { x: tx, y: ty } = getTileRect(tileId)
    return extractImageData(
      imgData,
      tx + sx,
      ty + sy,
      w,
      h,
    )
  }

  function clear(
    x = 0,
    y = 0,
    w = imgData.width,
    h = imgData.height,
    mask: Uint8Array | null = null,
  ) {
    clearImageData(imgData, x, y, w, h, mask)
    markAllTilesDirty()
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
    markAllTilesDirty()
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

  function splitRectIntoTileRects(rect: Rect & { srcX?: number, srcY?: number }) {
    const overlaps = getOverlappingTiles(rect)
    const out = []
    for (let i = 0; i < overlaps.length; i++) {
      const o = overlaps[i]
      out.push({
        tileId: o.tileId,
        x: o.tileOverlap.x,
        y: o.tileOverlap.y,
        w: o.tileOverlap.w,
        h: o.tileOverlap.h,
        srcX: rect.srcX ?? 0 + o.srcX,
        srcY: rect.srcY ?? 0 + o.srcY,
      })
    }

    return out
  }

  function getOverlappingTiles(rect: Rect) {
    const results = []

    const startTileX = Math.floor(rect.x / tileSize)
    const startTileY = Math.floor(rect.y / tileSize)
    const endTileX = Math.floor((rect.x + rect.w - 1) / tileSize)
    const endTileY = Math.floor((rect.y + rect.h - 1) / tileSize)

    for (let ty = startTileY; ty <= endTileY; ty++) {
      for (let tx = startTileX; tx <= endTileX; tx++) {

        const index = ty * tilesPerRow + tx
        const tile = tileset.tiles[index]
        if (!tile) continue

        const tileSheetX = tx * tileSize
        const tileSheetY = ty * tileSize

        // intersection in sheet space
        const ix = Math.max(rect.x, tileSheetX)
        const iy = Math.max(rect.y, tileSheetY)
        const ix2 = Math.min(rect.x + rect.w, tileSheetX + tileSize)
        const iy2 = Math.min(rect.y + rect.h, tileSheetY + tileSize)

        const iw = ix2 - ix
        const ih = iy2 - iy
        if (iw <= 0 || ih <= 0) continue

        // tile-local overlap
        const tileLocalX = ix - tileSheetX
        const tileLocalY = iy - tileSheetY

        // source offsets inside the source image
        const srcX = ix - rect.x
        const srcY = iy - rect.y

        results.push({
          tile,
          tileId: tile.id,

          // tile-local clipped rect
          tileOverlap: {
            x: tileLocalX,
            y: tileLocalY,
            w: iw,
            h: ih,
          },

          // sheet-space clipped rect
          sheetOverlap: {
            x: ix,
            y: iy,
            w: iw,
            h: ih,
          },

          // source offsets for blending/pasting
          srcX,
          srcY,
        })
      }
    }

    return results
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

  function getHistoryPixels(
    tileId: TileId,
    rect: Rect,
  ) {
    const { x, y, w, h } = rect
    return extractHistoryPixels(extractTile(tileId, x, y, w, h), rect)
  }

  // this should be the only place the tilesheet image data is directly mutated
  function setHistoryPixels(
    tileId: TileId,
    data: Uint8ClampedArray,
    rect: Rect,
  ) {
    const { x, y, w, h } = rect
    const { x: sx, y: sy } = tileLocalToSheet(tileId, x, y)
    const tile = tileset.byId.get(tileId)!
    tileVersions[tile.index]++
    currentVersion++
    return applyHistoryPixels(imgData, data, sx, sy, w, h)
  }

  return {
    tileset,
    clear,
    getTileSheetOffset,
    getTileVersion: (tileId: TileId) => {
      const index = tileset.byId.get(tileId)?.index
      return index !== undefined ? tileVersions[index] : -1
    },
    get version(): number {
      return currentVersion
    },
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
    getTileRect,
    tileLocalToSheet,
    sheetToTileLocal,
    extractTile,
    resizeTileSize,
    getTileCoords,
    each,
    sheetPixelToTileId,
    extractImageData: (rect: Rect): ImageData => extractImageData(imgData, rect),
    getHistoryPixels,
    setHistoryPixels,
    getOverlappingTiles,
    splitRectIntoTileRects,
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
