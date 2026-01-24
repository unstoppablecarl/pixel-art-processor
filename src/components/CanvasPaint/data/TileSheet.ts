import { markRaw } from 'vue'
import type { RectBounds } from '../../../lib/util/data/Bounds.ts'
import {
  deserializeImageData,
  extractImageData,
  resizeImageData,
  type SerializedImageData,
  serializeImageData,
  writeImageData,
} from '../../../lib/util/html-dom/ImageData.ts'
import {
  AxialEdgeWangTileset,
  deserializeAxialEdgeWangTileset,
  type SerializedAxialEdgeWangTileset,
  type TileId,
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

  let dirty = false

  const tilesPerRow = tilesX ?? Math.ceil(Math.sqrt(tileset.tiles.length))
  const tilesPerCol = tilesY ?? Math.ceil(tileset.tiles.length / tilesPerRow)

  const width = tilesPerRow * tileSize
  const height = tilesPerCol * tileSize

  let img = imageData ?? new ImageData(width, height)
  let imgData = markRaw(img)

  // Build TileId → index mapping
  const tileIndexMap = new Map<TileId, number>()
  tileset.tiles.forEach((tile, index) => {
    tileIndexMap.set(tile.id, index)
  })

  function getTileRect(tileId: TileId): RectBounds {
    const index = tileIndexMap.get(tileId)
    if (index === undefined) {
      throw new Error(`Unknown tileId: ${tileId}`)
    }
    const tx = index % tilesPerRow
    const ty = Math.floor(index / tilesPerRow)
    return {
      x: tx * tileSize,
      y: ty * tileSize,
      w: tileSize,
      h: tileSize,
    }
  }

  function tileLocalToSheet(tileId: TileId, lx: number, ly: number) {
    const rect = getTileRect(tileId)
    return { x: rect.x + lx, y: rect.y + ly }
  }

  function extractTile(tileId: TileId): ImageData {
    const { x, y, w, h } = getTileRect(tileId)
    return extractImageData(imgData, x, y, w, h)
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
    imgData = imgData = markRaw(newSheet)
    dirty = true
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

    markDirty: () => dirty = true,
    isDirty: () => dirty,
    clearDirty: () => dirty = false,
    getTileRect,
    tileLocalToSheet,
    extractTile,
    writeTile,
    resizeTileSize,
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
