import type { TileId } from '../../../../lib/wang-tiles/WangTileset.ts'
import type { TileSheet } from './TileSheet.ts'

export type TileChangeCallback = (tileId: TileId) => void;

export function makeTileSheetSync(tileSheet: TileSheet) {
  const initialTileCount = tileSheet.tileset.tiles.length
  let lastSeenVersion = -1
  let localVersions = new Uint32Array(initialTileCount)

  return (sheet: TileSheet, onTileChanged: TileChangeCallback) => {
    const currentTileCount = sheet.tileset.tiles.length

    // --- Handle Resize ---
    if (currentTileCount !== localVersions.length) {
      const newVersions = new Uint32Array(currentTileCount)
      // Copy over old versions so we don't trigger "dirty" for old tiles
      newVersions.set(localVersions.subarray(0, Math.min(localVersions.length, currentTileCount)))
      localVersions = newVersions
    }

    if (sheet.version === lastSeenVersion) return

    const tiles = sheet.tileset.tiles
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i]
      const currentVersion = sheet.getTileVersion(tile.id)
      const index = tile.index

      console.log('tiles sync', tile.id, currentVersion > localVersions[index], localVersions[index], currentVersion)
      if (currentVersion !== localVersions[index]) {
        onTileChanged(tile.id)
        localVersions[index] = currentVersion
      }
    }
    lastSeenVersion = sheet.version
  }
}

export function makeSingleTileSync(tileId: TileId) {
  let lastSeenVersion = -1
  return (sheet: TileSheet, onTileChanged: TileChangeCallback) => {
    const currentVersion = sheet.getTileVersion(tileId)
    if (currentVersion !== lastSeenVersion) {
      onTileChanged(tileId)
      lastSeenVersion = currentVersion
    }
  }
}