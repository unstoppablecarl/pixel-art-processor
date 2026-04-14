import { markRaw } from 'vue'
import {
  blendPixelData,
  extractPixelData,
  makePixelData,
  type MutablePixelData32,
  PixelData,
  resizePixelData,
  type SerializedImageData,
  setPixelData,
  writePixelData,
} from '../../../../../pixel-data-js/src'
import type { Point } from '../../../lib/node-data-types/BaseDataStructure.ts'

import type { Rect } from '../../../lib/util/data/Rect.ts'
import { deserializeImageData, serializeImageData } from '../../../lib/util/html-dom/ImageData.ts'
import {
  AxialEdgeWangTileset,
  deserializeAxialEdgeWangTileset,
  type SerializedAxialEdgeWangTileset,
  type TileId,
  type WangTile,
} from '../../../lib/wang-tiles/WangTileset.ts'

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
  let pixelData = markRaw(makePixelData(img))

  let tileSheetTiles: TileSheetTile[] = []

  for (const t of tileset.tiles) {
    const index = t.id

    const tx = index % tilesPerRow
    const ty = Math.floor(index / tilesPerRow)

    tileSheetTiles[t.id] = {
      tileId: t.id,
      index: index,
      tileX: tx,
      tileY: ty,
      x: tx * tileSize,
      y: ty * tileSize,
      edges: t.edges,
      edgesId: t.edgesId,
    }
  }

  // fast path
  function getTileSheetOffset(tileId: TileId, out: Point = { x: 0, y: 0 }): Point {
    const t = tileSheetTiles[tileId]
    out.x = t.x
    out.y = t.y

    return out
  }

  function getTileRect(tileId: TileId): Rect {
    const t = tileSheetTiles[tileId]

    return {
      x: t.tileX * tileSize,
      y: t.tileY * tileSize,
      w: tileSize,
      h: tileSize,
    }
  }

  function tileLocalToSheet(tileId: TileId, tx: number, ty: number) {
    const rect = getTileRect(tileId)

    return { x: rect.x + tx, y: rect.y + ty }
  }

  function sheetToTileLocal(tileId: TileId, sx: number, sy: number) {
    const t = tileSheetTiles[tileId]

    const localX = sx - t.tileX * tileSize
    const localY = sy - t.tileY * tileSize

    return { x: localX, y: localY }
  }

  function each(cb: (sTileX: number, sTileY: number, tile: WangTile<number>) => void) {
    tileset.tiles.forEach((tile) => {
      const t = tileSheetTiles[tile.id]
      cb(t.tileX, t.tileY, tile)
    })
  }

  function extractTile(
    tileId: TileId,
    sx = 0,
    sy = 0,
    w = tileSize,
    h = tileSize,
  ): PixelData {
    const { x: tx, y: ty } = getTileRect(tileId)
    return extractPixelData(
      pixelData,
      tx + sx,
      ty + sy,
      w,
      h,
    )
  }

  function resizeTileSize(newTileSize: number) {
    if (newTileSize === tileSize) return

    const oldTileSize = tileSize
    const tileCount = tileset.tiles.length

    // Phase 1: extract
    const extracted = new Array<MutablePixelData32>(tileCount)
    for (let index = 0; index < tileCount; index++) {
      const oldX = (index % tilesPerRow) * oldTileSize
      const oldY = Math.floor(index / tilesPerRow) * oldTileSize
      extracted[index] = extractPixelData(pixelData, oldX, oldY, oldTileSize, oldTileSize)! as MutablePixelData32
    }

    // Phase 2: resize
    const resized = extracted.map(tile =>
      resizePixelData(tile, newTileSize, newTileSize, 0, 0, tile),
    )

    // Phase 3: write into new sheet
    const newWidth = tilesPerRow * newTileSize
    const newHeight = tilesPerCol * newTileSize
    setPixelData(pixelData, new ImageData(newWidth, newHeight))

    for (let index = 0; index < tileCount; index++) {
      const newX = (index % tilesPerRow) * newTileSize
      const newY = Math.floor(index / tilesPerRow) * newTileSize
      writePixelData(pixelData, resized[index], newX, newY)
    }

    // Phase 4: commit
    tileSize = newTileSize
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
      imageData: serializeImageData(pixelData.imageData),
      tileset: tileset.serialize(),
      tilesX: tilesPerRow,
      tilesY: tilesPerCol,
    }
  }

  function blendTilePixelData(tileId: TileId, src: PixelData & { x: number, y: number }) {
    const result = blendPixelData(
      pixelData,
      src,
      {
        x: src.x,
        y: src.y,
      },
    )

    if (!result) return false
    tileVersions[tileId]++
    currentVersion++

    return true
  }

  return {
    tileset,
    getTileSheetOffset,
    getTileVersion: (tileId: TileId) => {
      return tileVersions[tileId] ?? -1
    },
    // mark tile as needing to be re-rendered when renderer next looks for changes
    markTileDirty(tileId: TileId) {
      tileVersions[tileId]++
      currentVersion++
    },
    get tiles() {
      return tileSheetTiles
    },
    get version(): number {
      return currentVersion
    },
    get tileSize() {
      return tileSize
    },
    get pixelData() {
      return pixelData
    },
    getTileRect,
    tileLocalToSheet,
    sheetToTileLocal,
    extractTile,
    resizeTileSize,
    each,
    sheetPixelToTileId,
    extractPixelData: (rect: Rect): PixelData => extractPixelData(pixelData, rect),
    getOverlappingTiles,
    serialize,
    markAllTilesDirty,
    blendTilePixelData,
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

export type TileSheetTile = Pick<WangTile<number>, 'edgesId' | 'edges'> & {
  readonly tileId: TileId,
  readonly index: number,
  readonly tileX: number,
  readonly tileY: number,
  readonly x: number,
  readonly y: number,
}
