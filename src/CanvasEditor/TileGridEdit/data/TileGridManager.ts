import { PixelData } from 'pixel-data-js'
import { computed, type ComputedRef, type Ref, shallowRef, watch } from 'vue'
import { type AxialEdgeWangGrid, makePerfectAxialEdgeWangGrid } from '../../../lib/wang-tiles/WangGrid.ts'
import { AxialEdgeWangTileset } from '../../../lib/wang-tiles/WangTileset.ts'
import { makeTileSheet, type TileSheetTile } from './TileSheet.ts'

export type TileGridManager = ReturnType<typeof makeTileGridManager>

export function makeTileGridManager(
  tileset: ComputedRef<AxialEdgeWangTileset<number>>,
  tileSize: Ref<number>,
  tileGridFactory: (tileset: AxialEdgeWangTileset<number>) => AxialEdgeWangGrid<number> = makePerfectAxialEdgeWangGrid,
) {
  const tileGrid = computed(() => tileGridFactory(tileset.value))

  const gridWidth = computed(() => tileGrid.value.width)
  const gridHeight = computed(() => tileGrid.value.height)

  const canvasWidth = computed(() => gridWidth.value * tileSize.value)
  const canvasHeight = computed(() => gridHeight.value * tileSize.value)

  const tileSheet = shallowRef(
    makeTileSheet({
      tileset: tileset.value,
      tileSize: tileSize.value,
    }),
  )

  watch(tileset, () => {

    const existingByEdgeIds = new Map<string, TileSheetTile>()

    const existingTiles = tileSheet.value.tiles
    for (const tile of existingTiles) {
      existingByEdgeIds.set(tile.edgesId, tile)
    }

    const newTileSheet = makeTileSheet({
      tileset: tileset.value,
      tileSize: tileSize.value,
    })

    for (const tile of tileset.value.tiles) {
      const existing = existingByEdgeIds.get(tile.edgesId)
      if (!existing) continue

      const pixelData = tileSheet.value.extractTile(existing.tileId);
      (pixelData as any).x = newTileSheet.tiles[tile.id].x;
      (pixelData as any).y = newTileSheet.tiles[tile.id].y

      newTileSheet.blendTilePixelData(tile.id, pixelData as PixelData & {
        x: number,
        y: number
      })
    }

    tileSheet.value = newTileSheet
  })

  watch(tileSize, () => {
    tileSheet.value.resizeTileSize(tileSize.value)
  })

  return {
    // reactive grid state
    tileGrid,
    tileset: computed(() => tileset.value),
    tileSize,
    tileSheet,

    // dimensions
    gridWidth,
    gridHeight,
    canvasWidth,
    canvasHeight,
  }
}
