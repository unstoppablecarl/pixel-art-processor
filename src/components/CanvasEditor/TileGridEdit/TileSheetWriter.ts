import type { Point } from '../../../lib/node-data-types/BaseDataStructure.ts'
import type { Direction } from '../../../lib/pipeline/_types.ts'
import {
  getPointsInEdgeMargins,
  mirrorTilePixelHorizontal,
  mirrorTilePixelVertical,
} from '../../../lib/util/data/Grid.ts'
import {
  clearImageDataRect,
  type RGBA,
  setImageDataPixelColor,
  setImageDataPixelsColor,
} from '../../../lib/util/html-dom/ImageData.ts'
import { useDirtyBatching } from '../../../lib/vue/batching.ts'
import { type TileId, type WangTile, WangTileset } from '../../../lib/wang-tiles/WangTileset.ts'
import { BlendMode } from '../_core-editor-types.ts'
import { selectMoveBlendModeToWriter } from '../_support/tools/selection-helpers.ts'
import type { TileSheet } from './data/TileSheet.ts'
import type { TileGridRenderer } from './renderers/TileGridRenderer.ts'
import type { TileGridEditorState } from './TileGridEditorState.ts'

export type TileSheetWriter = ReturnType<typeof makeTileSheetWriter>

export function makeTileSheetWriter(
  {
    state,
    gridRenderer,
  }: {
    state: TileGridEditorState
    gridRenderer: TileGridRenderer,
  }) {

  const { markDirty } = useDirtyBatching<TileId>((dirtyTiles) => {
    for (const tileId of dirtyTiles) {
      gridRenderer.queueRenderTile(tileId)
    }
    gridRenderer.queueRenderGrid()
  })

  function writeTilePixel(tileId: TileId, tx: number, ty: number, color: RGBA) {
    const { x, y } = state.tileSheet.tileLocalToSheet(tileId, tx, ty)
    setImageDataPixelColor(state.tileSheet.imageData, x, y, color)
    state.tileSheet.markDirty()
  }

  function blendSheetImageData(
    imageData: ImageData,
    blendMode: BlendMode,
    x = 0,
    y = 0,
    sx = 0,
    sy = 0,
    w = imageData.width,
    h = imageData.height,
  ) {
    const writer = selectMoveBlendModeToWriter[blendMode]
    writer(state.tileSheet.imageData, imageData, x, y, sx, sy, w, h)
  }

  return {
    blendSheetImageData,
    clear() {
      clearImageDataRect(
        state.tileSheet.imageData,
        0,
        0,
        state.tileSheet.imageData.width,
        state.tileSheet.imageData.height,
      )

      for (const tile of state.tileset.tiles) {
        markDirty(tile.id)
      }
      state.tileSheet.markDirty()
    },

    writeGridPixels(gridPixels: Point[], color: RGBA) {
      const tileset = state.tileset

      gridPixels.forEach(({ x, y }) => {
        const hit = state.tileGridManager.gridPixelToTile(x, y)
        if (!hit) return

        const { tile } = hit
        if (!tile) return

        const { x: tx, y: ty } = state.tileGridManager.gridPixelToTilePixel(x, y)!
        writeTilePixel(tile.id, tx, ty, color)

        const affected = duplicateEdgePixels(
          tileset,
          state.tileSheet,
          tile.id,
          [{ x: tx, y: ty }],
          color,
          state.tileMarginCopySize,
        )

        affected?.forEach(t => markDirty(t.id))
        markDirty(tile.id)
      })
      state.tileSheet.markDirty()
    },

    clearRect(x: number, y: number, w: number, h: number) {
      const rect = { x, y, w, h }
      const overlapping = state.tileGridManager.getOverlappingTiles(rect)
      clearImageDataRect(state.tileSheet.imageData, x, y, w, h)

      for (const { tile } of overlapping) {
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
