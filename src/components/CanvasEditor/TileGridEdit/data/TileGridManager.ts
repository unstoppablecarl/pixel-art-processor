import { computed, type ComputedRef, type Ref, shallowRef, watch } from 'vue'
import type { Point } from '../../../../lib/node-data-types/BaseDataStructure.ts'

import type { Rect } from '../../../../lib/util/data/Rect.ts'
import { type AxialEdgeWangGrid, makeAxialEdgeWangGrid } from '../../../../lib/wang-tiles/WangGrid.ts'
import type { AxialEdgeWangTileset, TileId } from '../../../../lib/wang-tiles/WangTileset.ts'
import { type SelectionTileSheetRect, type TileSheetSelection } from '../lib/TileSheetSelection.ts'
import { makeTileGridEdgeColorRenderer } from '../renderers/TileGridEdgeColorRenderer.ts'
import { makeTileSheet } from './TileSheet.ts'

export type TileGridManager = ReturnType<typeof makeTileGridManager>

export function makeTileGridManager(
  tileset: ComputedRef<AxialEdgeWangTileset<number>>,
  tileSize: Ref<number>,
  tileGridFactory: (tileset: AxialEdgeWangTileset<number>) => AxialEdgeWangGrid<number> = makeAxialEdgeWangGrid,
) {

  const tileGrid = computed(() => tileGridFactory(tileset.value))

  const tileGridEdgeColorRenderer = makeTileGridEdgeColorRenderer(tileGrid, tileSize)

  const gridWidth = computed(() => tileGrid.value.width)
  const gridHeight = computed(() => tileGrid.value.height)

  const canvasWidth = computed(() => tileSize.value * gridWidth.value)
  const canvasHeight = computed(() => tileSize.value * gridHeight.value)

  function gridPixelToTile(gridPixelX: number, gridPixelY: number) {
    const x = Math.floor(gridPixelX / tileSize.value)
    const y = Math.floor(gridPixelY / tileSize.value)
    const tile = tileGrid.value.get(x, y)
    if (!tile) return

    return {
      tileX: x,
      tileY: y,
      tile,
    }
  }

  function gridPixelToTileSheetPixel(gx: number, gy: number) {
    const r = gridPixelToTilePixel(gx, gy)
    if (!r) return
    const { x, y, tileId } = r
    return {
      ...tileSheet.value.tileLocalToSheet(tileId, x, y),
      tileLocalX: x,
      tileLocalY: y,
      tileId: r.tileId,
    }
  }

  function gridPixelToTilePixel(gridPixelX: number, gridPixelY: number) {
    const r = gridPixelToTile(gridPixelX, gridPixelY)
    if (!r) return
    const { tileX, tileY, tile } = r

    return {
      tileId: tile.id,
      x: gridPixelX - tileX * tileSize.value,
      y: gridPixelY - tileY * tileSize.value,
    }
  }

  function getTileInfo(tileId: TileId) {
    return tileGrid.value.mapWithTileId(tileId, (tileX, tileY, tile) => {
      return {
        tileX,
        tileY,
        gridPixelBounds: {
          x: tileX * tileSize.value,
          y: tileY * tileSize.value,
          w: tileSize.value,
          h: tileSize.value,
        },
        tile,
      }
    })
  }

  function tileCoordToGridPixel(tileX: number, tileY: number, pixelX = 0, pixelY = 0): Point {
    return {
      x: tileX * tileSize.value + pixelX,
      y: tileY * tileSize.value + pixelY,
    }
  }

  const tileSheet = shallowRef(makeTileSheet({
    tileset: tileset.value,
    tileSize: tileSize.value,
  }))

  watch(tileset, () => {
    tileSheet.value = makeTileSheet({
      tileset: tileset.value,
      tileSize: tileSize.value,
    })
  })

  watch(tileSize, () => {
    tileSheet.value.resizeTileSize(tileSize.value)
  })

  function getOverlappingTilesOnGrid(rect: Rect) {
    return tileGrid.value.getOverlappingTiles(rect, tileSize.value)
  }

  // rect must only overlap with one tileSheet tile
  function projectTileSheetRectToGridRects(rect: SelectionTileSheetRect): SelectionTileSheetRect[] {
    const { tileId, x, y, w, h, bufferX, bufferY, mask } = rect

    // Convert sheet → tile-local
    const { x: localX, y: localY } = tileSheet.value.sheetToTileLocal(tileId, x, y)

    const results: SelectionTileSheetRect[] = []

    tileGrid.value.mapWithTileId(tileId, (gx, gy) => {
      results.push({
        tileId,
        x, y, w, h,
        tileX: localX,
        tileY: localY,
        gridX: gx * tileSize.value + localX,
        gridY: gy * tileSize.value + localY,
        bufferX,
        bufferY,
        mask,
      })
    })

    return results
  }

  function gridPointInTileSheetSelection(
    gx: number,
    gy: number,
    selection: TileSheetSelection,
  ): boolean {
    const r = gridPixelToTileSheetPixel(gx, gy)
    if (!r) return false
    const { x: sheetX, y: sheetY } = r

    for (const rect of selection.currentRects) {
      if (
        sheetX >= rect.x &&
        sheetX < rect.x + rect.w &&
        sheetY >= rect.y &&
        sheetY < rect.y + rect.h
      ) {
        return true
      }
    }

    return false
  }

  function gridRectToTileSheetRects(rect: Rect): SelectionTileSheetRect[] {
    const overlaps = getOverlappingTilesOnGrid(rect)
    const out = []

    for (const o of overlaps) {
      const { tile, tileOverlap } = o
      const { x: localX, y: localY, w, h } = tileOverlap

      if (w <= 0 || h <= 0) continue

      const { x: tileSheetX, y: tileSheetY } =
        tileSheet.value.getTileRect(tile.id)

      const sheetX = tileSheetX + localX
      const sheetY = tileSheetY + localY

      out.push({
        tileId: tile.id,

        // tileSheet local pixel coords
        x: sheetX,
        y: sheetY,
        w,
        h,

        // tile local pixel coords
        tileX: localX,
        tileY: localY,

        // grid-space coords
        gridX: o.gridOverlap.x,
        gridY: o.gridOverlap.y,

        // buffer space coords
        bufferX: o.sourceX,
        bufferY: o.sourceY,
      } as SelectionTileSheetRect)
    }

    return out
  }

  return {
    gridWidth,
    gridHeight,
    canvasWidth,
    canvasHeight,
    tileset,
    tileGrid,
    tileSize,
    tileGridEdgeColorRenderer,
    getOverlappingTiles: getOverlappingTilesOnGrid,
    gridPixelToTile,
    gridPixelToTilePixel,
    tileCoordToGridPixel,
    gridPointInTileSheetSelection,
    gridRectToTileSheetRects,
    projectTileSheetRectToGridRects,
    gridPixelToTileSheetPixel,
    getTileInfo,
    tileSheet,
  }
}