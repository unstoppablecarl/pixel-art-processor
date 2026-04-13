import type { PixelData } from 'pixel-data-js'
import { makePixelData } from '../../../../../pixel-data-js/src'
import type { TileId } from '../../../lib/wang-tiles/WangTileset.ts'
import type { TileGridEditorState } from '../TileGridEditorState.ts'
import type { TileSheetTile } from './TileSheet.ts'

export type TileSheetPaintBufferTile = PixelData & TileSheetTile

export class TileSheetPaintBuffer {
  tiles: TileSheetPaintBufferTile[] = []

  constructor(
    protected state: TileGridEditorState,
  ) {
    this.sync()
  }

  sync() {
    const state = this.state
    const tileSize = state.tileSize
    const tileset = state.tileSheet.tileset

    this.tiles = new Array(tileset.tiles.length)

    for (const tile of tileset.tiles) {
      const t = state.tileSheet.tiles[tile.index]

      this.tiles[tile.index] = {
        ...t,
        ...makePixelData(new ImageData(tileSize, tileSize)),
      }
    }
  }

  get(tileId: TileId): TileSheetPaintBufferTile {
    const index = this.state.tileSheet.tileset.byId.get(tileId)!.index
    return this.tiles[index]
  }

  clear() {
    for (const tile of this.tiles) {
      tile?.data.fill(0)
    }
  }
}