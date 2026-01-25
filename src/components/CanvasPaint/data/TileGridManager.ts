import { computed, type ComputedRef, type Ref, shallowRef, watch } from 'vue'
import type { Point } from '../../../lib/node-data-types/BaseDataStructure.ts'
import type { RectBounds } from '../../../lib/util/data/Bounds.ts'
import { type AxialEdgeWangGrid, makeAxialEdgeWangGrid } from '../../../lib/wang-tiles/WangGrid.ts'
import type { AxialEdgeWangTileset, TileId } from '../../../lib/wang-tiles/WangTileset.ts'
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

  watch([tileset, tileSize], () => {
    tileSheet.value = makeTileSheet({
      tileset: tileset.value,
      tileSize: tileSize.value,
    })
  })

  function getOverlappingTiles(
    rect: RectBounds,
    tileSize: number,
  ) {
    const results: {
      tile: any,
      tileX: number,
      tileY: number,
      tileOverlap: RectBounds,
      gridOverlap: RectBounds,
    }[] = []

    const startTileX = Math.floor(rect.x / tileSize)
    const startTileY = Math.floor(rect.y / tileSize)
    const endTileX = Math.floor((rect.x + rect.w - 1) / tileSize)
    const endTileY = Math.floor((rect.y + rect.h - 1) / tileSize)

    for (let ty = startTileY; ty <= endTileY; ty++) {
      for (let tx = startTileX; tx <= endTileX; tx++) {
        const tile = tileGrid.value.get(tx, ty)
        if (!tile) continue

        const tilePx = tx * tileSize
        const tilePy = ty * tileSize

        // Intersection in grid-pixel space
        const ix = Math.max(rect.x, tilePx)
        const iy = Math.max(rect.y, tilePy)
        const ix2 = Math.min(rect.x + rect.w, tilePx + tileSize)
        const iy2 = Math.min(rect.y + rect.h, tilePy + tileSize)

        const iw = ix2 - ix
        const ih = iy2 - iy
        if (iw <= 0 || ih <= 0) continue

        // Tile-local overlap
        const overlapX = ix - tilePx
        const overlapY = iy - tilePy

        // Source-local overlap
        const sourceX = ix - rect.x
        const sourceY = iy - rect.y

        results.push({
          tile,
          tileX: tx,
          tileY: ty,
          tileOverlap: {
            x: overlapX,
            y: overlapY,
            w: iw,
            h: ih,
          },
          gridOverlap: {
            x: sourceX,
            y: sourceY,
            w: iw,
            h: ih,
          },
        })
      }
    }

    return results
  }

  return {
    tileSize,
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
    getTileInfo,
    tileSheet,
  }
}