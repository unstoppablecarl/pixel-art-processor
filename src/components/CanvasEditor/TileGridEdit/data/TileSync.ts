import type { TileId } from '../../../../lib/wang-tiles/WangTileset.ts'
import type { TileSheet } from './TileSheet.ts'

export type TileChangeCallback = (tileId: TileId) => void;

export function makeTileSheetSync(tileSheet: TileSheet) {
  const initialTileCount = tileSheet.tileset.tiles.length
  let currentTileCount = initialTileCount
  let lastSeenVersion = -1
  let localVersions = new Uint32Array(initialTileCount)

  const result = (sheet: TileSheet, onTileChanged: TileChangeCallback) => {
    const count = sheet.tileset.tiles.length
    if (count !== localVersions.length) {
      currentTileCount = count
      localVersions = new Uint32Array(count)
      lastSeenVersion = -1
    }

    if (sheet.version === lastSeenVersion) return

    const tiles = sheet.tileset.tiles
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i]
      const currentVersion = sheet.getTileVersion(tile.id)
      const index = tile.index

      if (currentVersion !== localVersions[index]) {
        onTileChanged(tile.id)
        localVersions[index] = currentVersion
      }
    }
    lastSeenVersion = sheet.version
  }

  result.reset = () => {
    lastSeenVersion = -1
    localVersions = new Uint32Array(currentTileCount)
  }

  return result
}

export function makeSingleTileSync(tileId: TileId) {
  let lastSeenVersion = -1
  const result = (sheet: TileSheet, onTileChanged: TileChangeCallback) => {
    const currentVersion = sheet.getTileVersion(tileId)
    if (currentVersion !== lastSeenVersion) {
      onTileChanged(tileId)
      lastSeenVersion = currentVersion
    }
  }

  result.reset = () => {
    lastSeenVersion = -1
  }
  return result
}