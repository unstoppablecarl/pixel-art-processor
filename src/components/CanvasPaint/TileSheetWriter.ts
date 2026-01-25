import type { Point } from '../../lib/node-data-types/BaseDataStructure.ts'
import type { Direction } from '../../lib/pipeline/_types.ts'
import {
  getPointsInEdgeMargins,
  mirrorTilePixelHorizontal,
  mirrorTilePixelVertical,
} from '../../lib/util/data/Grid.ts'
import { blendImageDataIgnoreSolid, blendImageDataIgnoreTransparent } from '../../lib/util/html-dom/blit.ts'
import {
  clearImageDataRect,
  type RGBA,
  setImageDataPixelColor,
  setImageDataPixelsColor,
  writeImageData,
} from '../../lib/util/html-dom/ImageData.ts'
import { useDirtyBatching } from '../../lib/vue/batching.ts'
import { type TileId, type WangTile, WangTileset } from '../../lib/wang-tiles/WangTileset.ts'
import { SelectMoveBlendMode } from './_canvas-editor-types.ts'
import type { TileSheet } from './data/TileSheet.ts'
import type { EditorState } from './EditorState.ts'
import type { TileGridRenderer } from './TileGridRenderer.ts'

export type TileSheetWriter = ReturnType<typeof makeTileSheetWriter>

export function makeTileSheetWriter(
  {
    state,
    gridRenderer,
  }: {
    state: EditorState
    gridRenderer: TileGridRenderer
  }) {

  // Dirty batching: sync tiles to gridRenderer
  const { markDirty } = useDirtyBatching<TileId>((dirtyTiles) => {
    for (const tileId of dirtyTiles) {
      gridRenderer.queueRenderTile(tileId)
    }
    gridRenderer.queueRenderGrid()
  })

  function writeTilePixel(tileId: TileId, lx: number, ly: number, color: RGBA) {
    const { x, y } = state.tileSheet.tileLocalToSheet(tileId, lx, ly)
    setImageDataPixelColor(state.tileSheet.imageData, x, y, color)
    state.tileSheet.markDirty()
  }

  // ------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------

  return {
    clear() {
      for (const tile of state.tileset.tiles) {
        const rect = state.tileSheet.getTileRect(tile.id)
        clearImageDataRect(state.tileSheet.imageData, rect.x, rect.y, rect.w, rect.h)
        markDirty(tile.id)
      }
      state.tileSheet.markDirty()
    },

    writeTilePixels(tilePixels: Point[], tileId: TileId, color: RGBA) {
      tilePixels.forEach(({ x, y }) => {
        writeTilePixel(tileId, x, y, color)
      })

      const affected = duplicateEdgePixels(
        state.tileset,
        state.tileSheet,
        tileId,
        tilePixels,
        color,
        state.tileMarginCopySize,
      )

      affected?.forEach(t => markDirty(t.id))
      markDirty(tileId)
      state.tileSheet.markDirty()
    },

    writeGridPixels(gridPixels: Point[], color: RGBA) {

      const tileset = state.tileset

      gridPixels.forEach(({ x, y }) => {
        const hit = state.tileGridManager.gridPixelToTile(x, y)
        if (!hit) return

        const { tile } = hit
        if (!tile) return

        const { x: lx, y: ly } = state.tileGridManager.gridPixelToTilePixel(x, y)!
        writeTilePixel(tile.id, lx, ly, color)

        const affected = duplicateEdgePixels(
          tileset,
          state.tileSheet,
          tile.id,
          [{ x: lx, y: ly }],
          color,
          state.tileMarginCopySize,
        )

        affected?.forEach(t => markDirty(t.id))
        markDirty(tile.id)
      })
      state.tileSheet.markDirty()
    },

    clearImageDataRect(gx: number, gy: number, w: number, h: number) {
      const rect = { x: gx, y: gy, w, h }
      const overlapping = state.tileGridManager.getOverlappingTiles(rect)

      for (const { tile, tileOverlap } of overlapping) {
        const { x, y, w: tw, h: th } = tileOverlap
        const sheetPos = state.tileSheet.tileLocalToSheet(tile.id, x, y)
        clearImageDataRect(state.tileSheet.imageData, sheetPos.x, sheetPos.y, tw, th)
        markDirty(tile.id)
      }
      state.tileSheet.markDirty()
    },

    blendImageData(imageData: ImageData, gx: number, gy: number, blendMode: SelectMoveBlendMode): TileId[] {
      const rect = { x: gx, y: gy, w: imageData.width, h: imageData.height }
      const overlapping = state.tileGridManager.getOverlappingTiles(rect)

      for (const { tile, tileOverlap, gridOverlap } of overlapping) {
        const { x, y } = tileOverlap
        const { x: sx, y: sy, w, h } = gridOverlap

        const sheetPos = state.tileSheet.tileLocalToSheet(tile.id, x, y)

        if (blendMode === SelectMoveBlendMode.OVERWRITE) {
          writeImageData(state.tileSheet.imageData, imageData, sheetPos.x, sheetPos.y, sx, sy, w, h)
        } else if (blendMode === SelectMoveBlendMode.IGNORE_TRANSPARENT) {
          blendImageDataIgnoreTransparent(state.tileSheet.imageData, imageData, sheetPos.x, sheetPos.y, sx, sy, w, h)
        } else if (blendMode === SelectMoveBlendMode.IGNORE_SOLID) {
          blendImageDataIgnoreSolid(state.tileSheet.imageData, imageData, sheetPos.x, sheetPos.y, sx, sy, w, h)
        }

        markDirty(tile.id)
      }
      state.tileSheet.markDirty()
      return overlapping.map(d => d.tile.id)
    },
  }
}

function duplicateEdgePixels(
  tileset: WangTileset<number>,
  tileSheet: TileSheet,
  tileId: TileId,
  pixels: Point[],
  color: RGBA,
  borderThickness: number = 10,
): WangTile<number>[] | undefined {

  const pixelEdges: Record<Direction, Point[]> = { N: [], S: [], E: [], W: [] }
  const tile = tileset.byId.get(tileId)!

  pixels.forEach(p =>
    getPointsInEdgeMargins(p, tileSheet.tileSize, borderThickness, pixelEdges),
  )

  if (
    pixelEdges.N.length === 0 &&
    pixelEdges.S.length === 0 &&
    pixelEdges.E.length === 0 &&
    pixelEdges.W.length === 0
  ) return

  let affected: WangTile<number>[] = []

  Object.entries(pixelEdges).forEach(([edgeKey, pts]) => {
    const edge = edgeKey as Direction
    const { sameEdge, mirroredEdge } = tileset.getTilesWithSameEdge(tile, edge)

    affected.push(...sameEdge, ...mirroredEdge)

    // Same-edge tiles
    sameEdge.forEach(t => {
      const sheetPts = pts.map(p => tileSheet.tileLocalToSheet(t.id, p.x, p.y))
      setImageDataPixelsColor(tileSheet.imageData, sheetPts, color)
    })

    // Mirrored-edge tiles
    mirroredEdge.forEach(t => {
      const mirroredPts =
        edge === 'N' || edge === 'S'
          ? pts.map(p => mirrorTilePixelVertical(p.x, p.y, tileSheet.tileSize))
          : pts.map(p => mirrorTilePixelHorizontal(p.x, p.y, tileSheet.tileSize))

      const sheetPts = mirroredPts.map(p => tileSheet.tileLocalToSheet(t.id, p.x, p.y))
      setImageDataPixelsColor(tileSheet.imageData, sheetPts, color)
    })
  })

  return affected
}
