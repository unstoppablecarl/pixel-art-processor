import { computed, shallowRef, watch } from "vue"
import type { ComputedRef, Ref } from "vue"

import type { AxialEdgeWangTileset } from "../../../../lib/wang-tiles/WangTileset"
import { type AxialEdgeWangGrid, makeAxialEdgeWangGrid } from '../../../../lib/wang-tiles/WangGrid'

import { makeTileSheet } from "./TileSheet"
import { makeTileGridGeometry } from "./TileGridGeometry"

export type TileGridManager = ReturnType<typeof makeTileGridManager>

export function makeTileGridManager(
  tileset: ComputedRef<AxialEdgeWangTileset<number>>,
  tileSize: Ref<number>,
  tileGridFactory: (tileset: AxialEdgeWangTileset<number>) => AxialEdgeWangGrid<number> = makeAxialEdgeWangGrid,
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
    })
  )

  watch(tileset, () => {
    tileSheet.value = makeTileSheet({
      tileset: tileset.value,
      tileSize: tileSize.value,
    })
  })

  watch(tileSize, () => {
    tileSheet.value.resizeTileSize(tileSize.value)
  })

  const geometry = computed(() =>
    makeTileGridGeometry(tileGrid.value, tileSheet.value, tileSize.value)
  )

  return {
    // reactive grid state
    tileGrid,
    tileset,
    tileSize,
    tileSheet,

    // geometry transforms
    geometry,

    // dimensions
    gridWidth,
    gridHeight,
    canvasWidth,
    canvasHeight,
  }
}
