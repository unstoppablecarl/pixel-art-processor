import type { Point } from '../../../../lib/node-data-types/BaseDataStructure.ts'
import { type CanvasEditToolStore, useCanvasEditToolStore } from '../../../../lib/store/canvas-edit-tool-store.ts'
import { type BlendImageDataOptions } from '../../../../lib/util/html-dom/blit.ts'
import { type RGBA, RGBA_ERASE } from '../../../../lib/util/html-dom/ImageData.ts'
import { useDirtyBatching } from '../../../../lib/vue/batching.ts'
import { type TileId } from '../../../../lib/wang-tiles/WangTileset.ts'
import { BlendMode } from '../../_core-editor-types.ts'
import { selectMoveBlendModeToBlendFn } from '../../_support/tools/selection-helpers.ts'
import type { TileGridRenderer } from '../renderers/TileGridRenderer.ts'
import type { TileGridEditorState } from '../TileGridEditorState.ts'
import { duplicateEdgePixels } from './TileEdgeDuplicator.ts'
import { applyTileSheetAccumulator } from './TileSheetHistory.ts'
import { makeTileSheetPixelAccumulator, type TileSheetPixelAccumulator } from './TileSheetPixelAccumulator.ts'

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

  const { markDirty } = useDirtyBatching<TileId>((dirtyTiles) => {
    for (const tileId of dirtyTiles) {
      gridRenderer.queueRenderTile(tileId)
    }
    gridRenderer.queueRenderGrid()
  })

  const accumulator = makeTileSheetPixelAccumulator()
  const mutator = makeTileSheetMutator({ state, markDirty, accumulator })

  return {
    withHistory(cb: (mutator: TileSheetMutator) => void) {
      cb(mutator)
      if (store.duplicateTileEdges) {
        const tileIds = accumulator.affectedTileIds()
        for (let i = 0; i < tileIds.length; i++) {
          const tileId = tileIds[i]
          duplicateEdgePixels({
            tileId,
            tileSheet: state.tileSheet,
            borderThickness: store.duplicateTileEdgesBorderThickness,
            accumulator,
          })
        }
      }

      const finalPatches = applyTileSheetAccumulator(state.tileSheet, gridRenderer, accumulator)

      accumulator.affectedTileIds().forEach(id => markDirty(id))

      return finalPatches
    },
  }
}

export type TileSheetMutator = ReturnType<typeof makeTileSheetMutator>

function makeTileSheetMutator(
  {
    state,
    markDirty,
    accumulator,
  }: {
    state: TileGridEditorState
    markDirty: (item: TileId) => void,
    accumulator: TileSheetPixelAccumulator,
  }) {

  function blendImageData(
    imageData: ImageData,
    blendMode: BlendMode,
    opts: Omit<BlendImageDataOptions, 'blendMode'>,
  ) {
    const blendFn = selectMoveBlendModeToBlendFn[blendMode]

    const sheetRect = {
      x: opts.dx ?? 0,
      y: opts.dy ?? 0,
      w: opts.sw ?? imageData.width,
      h: opts.sh ?? imageData.height,
      srcX: opts.sx ?? 0,
      srcY: opts.sy ?? 0,
    }

    const tileRects = state.tileSheet.splitRectIntoTileRects(sheetRect)

    for (let i = 0; i < tileRects.length; i++) {
      const r = tileRects[i]
      const tileId = r.tileId

      for (let y = 0; y < r.h; y++) {
        for (let x = 0; x < r.w; x++) {
          const si = ((r.srcY + y) * imageData.width + (r.srcX + x)) * 4

          const color = {
            r: imageData.data[si],
            g: imageData.data[si + 1],
            b: imageData.data[si + 2],
            a: imageData.data[si + 3],
          }

          accumulator.addTileBlend(tileId, r.x + x, r.y + y, color, blendFn)
        }
      }
    }
  }

  function clear(
    x = 0,
    y = 0,
    w = state.tileSheet.imageData.width,
    h = state.tileSheet.imageData.height,
    mask: Uint8Array | null = null,
  ) {
    // sheet-space rect
    const sheetRect = {
      x,
      y,
      w,
      h,
      srcX: 0,
      srcY: 0,
    }

    // split into tile-local rects
    const tileRects = state.tileSheet.splitRectIntoTileRects(sheetRect)

    for (let i = 0; i < tileRects.length; i++) {
      const r = tileRects[i]
      const tileId = r.tileId

      for (let ty = 0; ty < r.h; ty++) {
        for (let tx = 0; tx < r.w; tx++) {

          // mask is in sheet-rect space, not tile-local space
          if (mask) {
            const maskIndex = (r.srcY + ty) * sheetRect.w + (r.srcX + tx)
            if (!mask[maskIndex]) continue
          }

          accumulator.addTile(tileId, r.x + tx, r.y + ty, RGBA_ERASE)
        }
      }
    }
  }

  function writeGridPoints(gridPixels: Point[], color: RGBA) {
    for (let i = 0; i < gridPixels.length; i++) {
      const { x, y } = gridPixels[i]
      const hit = state.tileGridGeometry.gridPixelToTilePixel(x, y)
      if (!hit) continue

      accumulator.addTile(hit.tileId, hit.tx, hit.ty, color)
      markDirty(hit.tileId)
    }
  }

  function writeTilePoints(tileId: TileId, tilePixels: Point[], color: RGBA) {
    for (let i = 0; i < tilePixels.length; i++) {
      const { x, y } = tilePixels[i]
      accumulator.addTile(tileId, x, y, color)
    }
  }

  return {
    writeGridPoints,
    writeTilePoints,
    blendImageData,
    clear,
  }
}
