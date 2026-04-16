import { makePixelData, type PixelData } from 'pixel-data-js'
import { computed, type ComputedRef, type ShallowRef } from 'vue'
import { arrayIndexToColor, type RGBA } from '../../../lib/util/data/color.ts'
import { makeWangTileEdgesPixelMap } from '../../../lib/wang-tiles/wang-tile-vue-helpers.ts'
import type { TileId } from '../../../lib/wang-tiles/WangTileset.ts'
import type { TileSheet } from '../data/TileSheet.ts'

export function makeTileSheetEdgeColorsComputed(
  tileSheet: ComputedRef<TileSheet | undefined | null> | ShallowRef<TileSheet | undefined | null>,
) {
  return computed(() => {
    if (!tileSheet.value) return []
    const edgeValues = tileSheet.value.tileset.edgeValues()
    return edgeValues.map((edgeValue) => arrayIndexToColor(edgeValue, edgeValues.length, 255))
  })
}

export function makeCachedWangTileEdgeColorImageDataComputed(
  tileSheet: ComputedRef<TileSheet | undefined | null> | ShallowRef<TileSheet | undefined | null>,
  edgeColors: ComputedRef<RGBA[]>,
): ComputedRef<Record<TileId, PixelData>> {
  return computed((): Record<TileId, PixelData> => {
    const tSheet = tileSheet.value
    if (!tSheet) return {}
    return Object.fromEntries(tSheet.tileset.tiles.map((tile) => {
        const imageData = makeWangTileEdgesPixelMap(tileSheet.value!.tileSize, tile, edgeColors.value).toImageData()
        return [
          tile.id,
          makePixelData(imageData),
        ]
      },
    ))
  })
}