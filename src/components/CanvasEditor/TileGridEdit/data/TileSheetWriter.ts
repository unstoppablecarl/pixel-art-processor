import {
  type BlendColor32,
  makeBatchedQueue,
  packRGBA,
  type PixelData,
  type PixelTile,
  PixelWriter,
} from 'pixel-data-js'
import { nextTick } from 'vue'
import type { Point } from '../../../../lib/node-data-types/BaseDataStructure.ts'
import { type CanvasEditToolStore, useCanvasEditToolStore } from '../../../../lib/store/canvas-edit-tool-store.ts'
import type { RGBA } from '../../../../lib/util/data/color.ts'
import { getHistory } from '../../../../lib/util/history/history.ts'
import { type TileId } from '../../../../lib/wang-tiles/WangTileset.ts'
import type { DrawRect } from '../lib/ISelection.ts'
import { blendSheetDrawRects, clearSheetDrawRect } from '../lib/TileGrid-blenders.ts'
import type { TileGridRenderer } from '../renderers/TileGridRenderer.ts'
import type { TileGridEditorState } from '../TileGridEditorState.ts'
import { duplicateEdgePixels } from './TileEdgeDuplicator.ts'
import type { TileSheet } from './TileSheet.ts'

export type TileSheetWriter = ReturnType<typeof makeTileSheetWriter>

export function makeTileSheetWriter(
  {
    state,
    gridRenderer,
    store = useCanvasEditToolStore(),
  }: {
    state: TileGridEditorState
    gridRenderer: TileGridRenderer,
    store: CanvasEditToolStore
  }) {

  const { markDirty } = makeBatchedQueue<TileId>((dirtyTiles) => {
    for (const tileId of dirtyTiles) {
      gridRenderer.queueRenderTile(tileId)
    }
    gridRenderer.queueRenderGrid()
  }, nextTick)

  function handleReactivity(patchTiles: PixelTile[]) {
    const affected = getAffectedTileSheetTileIds(state.tileSheet, patchTiles, writer.config.tileSize)
    for (let i = 0; i < affected.length; i++) {
      state.tileSheet.markTileDirty(affected[i])
      markDirty(affected[i])
    }
  }

  const writer = new PixelWriter(
    state.tileSheet.pixelData,
    (w) => makeTileSheetMutator(w, state, markDirty),
    {
      historyManager: getHistory(),
    },
  )

  return {
    withHistory(cb: (mutator: TileSheetMutator) => void) {
      writer.withHistory(
        (mutator) => {
          cb(mutator)
          if (store.duplicateTileEdges) {

            const tileIds = getAffectedTileSheetTileIds(state.tileSheet, writer.accumulator.beforeTiles, writer.config.tileSize)
            for (let i = 0; i < tileIds.length; i++) {
              const tileId = tileIds[i]
              duplicateEdgePixels(
                tileId,
                store.duplicateTileEdgesBorderThickness,
                state.tileSheet,
                writer,
              )
            }
          }

          handleReactivity(writer.accumulator.beforeTiles)
        },
        (patch) => handleReactivity(patch.beforeTiles),
        (patch) => handleReactivity(patch.afterTiles),
      )
    },
  }
}

type TileSheetMutator = ReturnType<typeof makeTileSheetMutator>

function makeTileSheetMutator(
  writer: PixelWriter<any>,
  state: TileGridEditorState,
  markDirty: (tileId: TileId) => void,
) {
  const target = writer.config.target

  function writePixel(x: number, y: number, color: RGBA) {
    writer.accumulator.storePixelBeforeState(x, y)
    const index = y * target.w + x
    target.data[index] = packRGBA(color)
  }

  function writeGridPoints(gridPixels: Point[], color: RGBA) {
    for (let i = 0; i < gridPixels.length; i++) {
      const { x, y } = gridPixels[i]
      const hit = state.tileGridGeometry.gridPixelToTilePixel(x, y)
      if (!hit) continue
      const sheetPx = state.tileSheet.tileLocalToSheet(hit.tileId, hit.tx, hit.ty)

      writePixel(sheetPx.x, sheetPx.y, color)
    }
  }

  function writeTilePoints(tileId: TileId, tilePixels: Point[], color: RGBA) {
    markDirty(tileId)
    for (let i = 0; i < tilePixels.length; i++) {
      const { x, y } = tilePixels[i]
      const sheetPx = state.tileSheet.tileLocalToSheet(tileId, x, y)

      writePixel(sheetPx.x, sheetPx.y, color)
    }
  }

  return {
    writeGridPoints,
    writeTilePoints,
    clearSheetDrawRect(r: DrawRect) {
      const didChange = writer.accumulator.storeRegionBeforeState(r.dx, r.dy, r.w, r.h)
      didChange(
        clearSheetDrawRect(target, r),
      )
    },
    blendSheetDrawRects(r: DrawRect, src: PixelData, blendFn: BlendColor32) {
      const didChange = writer.accumulator.storeRegionBeforeState(r.dx, r.dy, r.w, r.h)
      didChange(
        blendSheetDrawRects(target, r, src, blendFn),
      )
    },
  }
}

function getAffectedTileSheetTileIds(tileSheet: TileSheet, pixelTiles: PixelTile[], tileSize: number) {
  const affectedIds = new Set<TileId>()

  for (let i = 0; i < pixelTiles.length; i++) {
    const tile = pixelTiles[i]
    const rect = {
      x: tile.tx * tileSize,
      y: tile.ty * tileSize,
      w: tileSize,
      h: tileSize,
    }

    const overlaps = tileSheet.getOverlappingTiles(rect)
    for (let j = 0; j < overlaps.length; j++) {
      affectedIds.add(overlaps[j].tileId)
    }
  }

  return Array.from(affectedIds)
}