import type { Point } from '../../lib/node-data-types/BaseDataStructure.ts'
import type { Direction } from '../../lib/pipeline/_types.ts'
import {
  getPointsInEdgeMargins,
  mirrorTilePixelHorizontal,
  mirrorTilePixelVertical,
} from '../../lib/util/data/Grid.ts'
import {
  blendImageDataIgnoreSolid,
  blendImageDataIgnoreTransparent,
  type ImageDataBlendFn,
} from '../../lib/util/html-dom/blit.ts'
import {
  clearImageDataRect,
  extractImageData,
  type RGBA,
  setImageDataPixelColor,
  setImageDataPixelsColor,
  writeImageData,
} from '../../lib/util/html-dom/ImageData.ts'
import { useDirtyBatching } from '../../lib/vue/batching.ts'
import { type TileId, type WangTile, WangTileset } from '../../lib/wang-tiles/WangTileset.ts'
import { BlendMode } from './_canvas-editor-types.ts'
import type { TileSheet } from './data/TileSheet.ts'
import type { EditorState } from './EditorState.ts'
import type { GlobalToolContext } from './GlobalToolManager.ts'
import type { TileSheetRect, TileSheetSelection } from './lib/TileSheetSelection.ts'
import type { TileGridRenderer } from './renderers/TileGridRenderer.ts'

export type TileSheetWriter = ReturnType<typeof makeTileSheetWriter>

export function makeTileSheetWriter(
  {
    state,
    gridRenderer,
    globalToolContext,
  }: {
    state: EditorState
    gridRenderer: TileGridRenderer,
    globalToolContext: GlobalToolContext
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

  const selectMoveBlendModeToWriter: Record<BlendMode, ImageDataBlendFn> = {
    [BlendMode.OVERWRITE]: writeImageData,
    [BlendMode.IGNORE_TRANSPARENT]: blendImageDataIgnoreTransparent,
    [BlendMode.IGNORE_SOLID]: blendImageDataIgnoreSolid,
  }

  function blendTileSheetRectFromGrid(
    rect: TileSheetRect,
    pixels: ImageData,
    blendMode: BlendMode,
    selection: TileSheetSelection,
  ) {
    const srcX = rect.x - selection.tileSheetBounds.x
    const srcY = rect.y - selection.tileSheetBounds.y

    blendSheetImageData(
      pixels,
      blendMode,
      rect.x,   // dest X in tilesheet
      rect.y,   // dest Y in tilesheet
      srcX,     // src X inside selection buffer
      srcY,     // src Y inside selection buffer
      rect.w,
      rect.h,
    )
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
    blendTileSheetRectFromGrid,
    blendSheetImageData,
    clear() {
      for (const tile of state.tileset.tiles) {
        const rect = state.tileSheet.getTileRect(tile.id)
        clearImageDataRect(state.tileSheet.imageData, rect.x, rect.y, rect.w, rect.h)
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

    clearGridRect(gx: number, gy: number, w: number, h: number) {
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

    blendGridImageData(imageData: ImageData, gx: number, gy: number, blendMode: BlendMode): TileId[] {
      const rect = { x: gx, y: gy, w: imageData.width, h: imageData.height }
      const overlapping = state.tileGridManager.getOverlappingTiles(rect)

      for (const { tile, tileOverlap, gridOverlap } of overlapping) {
        const { x, y } = tileOverlap
        const { x: sx, y: sy, w, h } = gridOverlap

        const sheetPos = state.tileSheet.tileLocalToSheet(tile.id, x, y)

        blendSheetImageData(imageData, blendMode, sheetPos.x, sheetPos.y, sx, sy, w, h)

        markDirty(tile.id)
      }
      state.tileSheet.markDirty()
      return overlapping.map(d => d.tile.id)
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

    clearTileRect(tileId: TileId, tx: number, ty: number, w: number, h: number) {
      const sheetPos = state.tileSheet.tileLocalToSheet(tileId, tx, ty)
      clearImageDataRect(state.tileSheet.imageData, sheetPos.x, sheetPos.y, w, h)
      markDirty(tileId)
      state.tileSheet.markDirty()
    },

    writeTileImageData(tileId: TileId, tx: number, ty: number, imageData: ImageData) {
      const sheetPos = state.tileSheet.tileLocalToSheet(tileId, tx, ty)
      writeImageData(state.tileSheet.imageData, imageData, sheetPos.x, sheetPos.y)
      markDirty(tileId)
      state.tileSheet.markDirty()
    },

    extractTileRect(tileId: TileId, tx: number, ty: number, w: number, h: number): ImageData {
      const sheetPos = state.tileSheet.tileLocalToSheet(tileId, tx, ty)
      return extractImageData(state.tileSheet.imageData, sheetPos.x, sheetPos.y, w, h)
    },

    blendTileImageData(tileId: TileId, imageData: ImageData, tx: number, ty: number, blendMode: BlendMode) {
      const w = imageData.width
      const h = imageData.height
      const sheetPos = state.tileSheet.tileLocalToSheet(tileId, tx, ty)
      blendSheetImageData(imageData, blendMode, sheetPos.x, sheetPos.y, tx, ty, w, h)

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
