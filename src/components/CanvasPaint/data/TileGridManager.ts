import { computed, type ComputedRef, type Ref, shallowRef, watch } from 'vue'
import type { Point } from '../../../lib/node-data-types/BaseDataStructure.ts'
import type { RectBounds } from '../../../lib/util/data/Bounds.ts'
import { type AxialEdgeWangGrid, makeAxialEdgeWangGrid } from '../../../lib/wang-tiles/WangGrid.ts'
import type { AxialEdgeWangTileset, TileId } from '../../../lib/wang-tiles/WangTileset.ts'
import { type TileSheetRect, type TileSheetSelection } from '../lib/TileSheetSelection.ts'
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
    if (!tileGrid.value) return
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

  function gridPixelToTilePixel(gridPixelX: number, gridPixelY: number): Point {
    return {
      x: gridPixelX % tileSize.value,
      y: gridPixelY % tileSize.value,
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

  function getOverlappingTiles(rect: RectBounds) {
    return tileGrid.value.getOverlappingTiles(rect, tileSize.value)
  }

  function projectTileSheetRectToGridRects(rect: TileSheetRect): RectBounds[] {
    const { tileId, x, y, w, h } = rect

    // Convert sheet → tile-local
    const { x: localX, y: localY } = tileSheet.value.sheetToTileLocal(tileId, x, y)

    return tileGrid.value.mapWithTileId(tileId, (gx, gy) => {
      return {
        x: gx * tileSize.value + localX,
        y: gy * tileSize.value + localY,
        w,
        h,
      }
    })
  }

  function gridPointInTileSheetSelection(
    gx: number,
    gy: number,
    selection: TileSheetSelection,
  ): boolean {

    const r = gridPixelToTile(gx, gy)
    if (!r) return false

    const { tile } = r

    const { x: localX, y: localY } = gridPixelToTilePixel(gx, gy)
    const { x: sheetX, y: sheetY } = tileSheet.value.tileLocalToSheet(tile.id, localX, localY)

    for (const r of selection.currentRects) {
      if (
        sheetX >= r.x &&
        sheetX < r.x + r.w &&
        sheetY >= r.y &&
        sheetY < r.y + r.h
      ) {
        return true
      }
    }

    return false
  }

  function gridRectToTileSheetRects(rect: RectBounds, bounds: RectBounds): TileSheetRect[] {
    const overlaps = getOverlappingTiles(rect)
    const out: TileSheetRect[] = []

    for (const o of overlaps) {

      const { tile, tileOverlap } = o
      const { x, y, w, h } = tileOverlap

      if (w <= 0 || h <= 0) continue

      // Convert tile-local → tileSheet pixel coords
      const { x: sheetX, y: sheetY } = tileSheet.value.tileLocalToSheet(tile.id, x, y)

      out.push({
        tileId: tile.id,
        x: sheetX,
        y: sheetY,
        w,
        h,

        // IMPORTANT: tileOverlap.x/y are in GRID INPUT SPACE
        srcX: x - bounds.x,
        srcY: y - bounds.y,
      })
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
    tileGridEdgeColorRenderer,
    getOverlappingTiles,
    gridPixelToTile,
    gridPixelToTilePixel,
    tileCoordToGridPixel,
    gridPointInTileSheetSelection,
    gridRectToTileSheetRects,
    projectTileSheetRectToGridRects,
    getTileInfo,
    tileSheet,
  }
}