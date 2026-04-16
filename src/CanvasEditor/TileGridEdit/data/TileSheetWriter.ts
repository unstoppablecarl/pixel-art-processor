import {
  makeBatchedQueue,
  makeReusableOffscreenCanvas,
  type PixelTile,
  PixelWriter,
  sourceOverPerfect,
} from 'pixel-data-js'
import { nextTick, watch } from 'vue'
import { type CanvasEditToolStore, useCanvasEditToolStore } from '../../../lib/store/canvas-edit-tool-store.ts'
import { getHistory } from '../../../lib/util/history/history.ts'
import { type TileId } from '../../../lib/wang-tiles/WangTileset.ts'
import type { TileGridRenderer } from '../renderers/TileGridRenderer.ts'
import type { TileGridEditorState } from '../TileGridEditorState.ts'
import type { TileSheet } from './TileSheet.ts'
import { duplicateChangedEdgePixels } from './TileSheetWriter/duplicateChangedEdgePixels.ts'
import { GridToTileSheetPaintBuffer } from './TileSheetWriter/GridToTileSheetPaintBuffer.ts'
import { makeTileSheetMutator, type TileSheetMutator } from './TileSheetWriter/TileSheetMutator.ts'
import { TileSheetPaintBuffer } from './TileSheetWriter/TileSheetPaintBuffer.ts'
import { TileToTileSheetPaintBuffer } from './TileSheetWriter/TileToTileSheetPaintBuffer.ts'

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

  function handleReactivityTileIds(tileIds: TileId[]) {
    for (let i = 0; i < tileIds.length; i++) {
      state.tileSheet.markTileDirty(tileIds[i])
      markDirty(tileIds[i])
    }
  }

  function handleReactivity(patchTiles: PixelTile[]) {
    const affected = getAffectedTileSheetTileIds(state.tileSheet, patchTiles, writer.config.tileSize)
    handleReactivityTileIds(affected)
  }

  function handleDuplicateEdges(tileIds: TileId[]) {
    if (store.duplicateTileEdges) {
      const affectedTIds = duplicateChangedEdgePixels(
        tileIds,
        store.duplicateTileEdgesBorderThickness,
        state.tileSheet,
        writer,
      )
      if (affectedTIds) {
        handleReactivityTileIds(affectedTIds)
      }
    }
  }

  let writer = syncWriter()

  function syncWriter() {
    return new PixelWriter(
      state.tileSheet.pixelData,
      makeTileSheetMutator,
      {
        historyManager: getHistory(),
      },
    )
  }

  const tileSheetPaintBuffer = new TileSheetPaintBuffer(state)
  const tileGridPaintBuffer = new GridToTileSheetPaintBuffer(store, tileSheetPaintBuffer, state)
  const tilePaintBuffer = new TileToTileSheetPaintBuffer(store, tileSheetPaintBuffer, state)

  const SCRATCH_affectedTileIds: TileId[] = []

  const getCanvas = makeReusableOffscreenCanvas()
  const getTileCanvas = makeReusableOffscreenCanvas()

  watch([
    state.reactive.tileset,
    state.reactive.tileSheet,
    state.reactive.tileSize,
  ], () => {
    writer = syncWriter()
    tileSheetPaintBuffer.sync()
  })

  return {
    tilePaintBuffer,
    tilePaintBufferDraw(
      targetCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
      tileId: TileId,
      alpha = 255,
      compOperation: GlobalCompositeOperation = 'source-over',
    ) {
      const {
        canvas,
        ctx,
      } = getTileCanvas(
        state.tileSize,
        state.tileSize,
      )
      const tile = tileSheetPaintBuffer.get(tileId)
      if (!tile) return

      targetCtx.globalAlpha = alpha / 255
      targetCtx.globalCompositeOperation = compOperation

      ctx.putImageData(tile.imageData, 0, 0)
      targetCtx.drawImage(canvas, 0, 0)

      targetCtx.globalAlpha = 1
      targetCtx.globalCompositeOperation = 'source-over'
    },

    tileGridPaintBuffer,
    tileGridPaintBufferDraw(
      targetCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
      alpha = 255,
      compOperation: GlobalCompositeOperation = 'source-over',
    ) {
      const {
        canvas,
        ctx,
      } = getCanvas(
        state.tileGridManager.canvasWidth.value,
        state.tileGridManager.canvasHeight.value,
      )
      const tiles = tileSheetPaintBuffer.tiles
      const tileSize = state.tileSize
      targetCtx.globalAlpha = alpha / 255
      targetCtx.globalCompositeOperation = compOperation

      state.tileGrid.each((x, y, t) => {
        const tile = tiles[t.id]
        ctx.putImageData(tile.imageData, 0, 0)
        targetCtx.drawImage(canvas, x * tileSize, y * tileSize)
      })

      targetCtx.globalAlpha = 1
      targetCtx.globalCompositeOperation = 'source-over'
    },
    paintBufferCommit(alpha = 255, blendFn = sourceOverPerfect) {
      const tileSize = state.tileSize
      const bufferTiles = tileSheetPaintBuffer.tiles
      if (bufferTiles.length < 1) return
      writer.withHistory(() => {
          const accumulator = writer.accumulator

          SCRATCH_affectedTileIds.length = 0

          for (let i = 0; i < bufferTiles.length; i++) {
            const tile = bufferTiles[i]

            if (tile) {
              const didChange = accumulator.storeRegionBeforeState(tile.x, tile.y, tileSize, tileSize)
              if (!didChange) continue

              const changed = didChange(
                state.tileSheet.blendTilePixelData(tile.tileId, tile, alpha, blendFn),
              )

              if (changed) {
                SCRATCH_affectedTileIds.push(tile.tileId)
              }
            }
          }

          tileSheetPaintBuffer.clear()
          handleReactivityTileIds(SCRATCH_affectedTileIds)
        },
        (patch) => handleReactivity(patch.beforeTiles),
        (patch) => handleReactivity(patch.afterTiles),
      )
    },
    withHistory(cb: (mutator: TileSheetMutator) => void) {
      writer.withHistory(
        (mutator) => {
          cb(mutator)
          if (store.duplicateTileEdges) {
            const tileIds = getAffectedTileSheetTileIds(state.tileSheet, writer.accumulator.beforeTiles, writer.config.tileSize)
            handleDuplicateEdges(tileIds)
          }

          handleReactivity(writer.accumulator.beforeTiles)
        },
        (patch) => handleReactivity(patch.beforeTiles),
        (patch) => handleReactivity(patch.afterTiles),
      )
    },
  }
}

const getAffectedTileSheetTileIds = (() => {
    const rect = { x: 0, y: 0, w: 0, h: 0 }
    const idSet = new Set<TileId>()
    const result: TileId[] = []

    return function getAffectedTileSheetTileIds(
      tileSheet: TileSheet,
      pixelTiles: PixelTile[],
      tileSize: number,
    ): TileId[] {
      idSet.clear()
      result.length = 0
      rect.w = tileSize
      rect.h = tileSize

      for (let i = 0; i < pixelTiles.length; i++) {
        const tile = pixelTiles[i]
        rect.x = tile.tx * tileSize
        rect.y = tile.ty * tileSize

        const overlaps = tileSheet.getOverlappingTiles(rect)
        for (let j = 0; j < overlaps.length; j++) {
          idSet.add(overlaps[j].tileId)
        }
      }

      for (const id of idSet) {
        result.push(id)
      }

      return result
    }
  }
)()
