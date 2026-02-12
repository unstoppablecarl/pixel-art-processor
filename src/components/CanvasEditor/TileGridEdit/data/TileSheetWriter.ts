import type { Point } from '../../../../lib/node-data-types/BaseDataStructure.ts'
import { type CanvasEditToolStore, useCanvasEditToolStore } from '../../../../lib/store/canvas-edit-tool-store.ts'
import type { RGBA } from '../../../../lib/util/color.ts'
import { type BlendImageDataOptions } from '../../../../lib/util/html-dom/blit.ts'
import { useDirtyBatching } from '../../../../lib/vue/batching.ts'
import { type TileId } from '../../../../lib/wang-tiles/WangTileset.ts'
import { BlendMode } from '../../_core/_core-editor-types.ts'
import { selectMoveBlendModeToBlendFn } from '../../_core/tools/selection-helpers.ts'
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
  const mutator = makeTileSheetMutator({ state, accumulator })

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

      const allAffected = accumulator.affectedTileIds()
      for (let i = 0; i < allAffected.length; i++) {
        markDirty(allAffected[i])
      }

      return finalPatches
    },
  }
}

export type TileSheetMutator = ReturnType<typeof makeTileSheetMutator>

const PACKED_ERASE = 0x00000000

function makeTileSheetMutator(
  {
    state,
    accumulator,
  }: {
    state: TileGridEditorState
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
    const mask = opts.mask ?? null

    const tileRects = state.tileSheet.splitRectIntoTileRects(sheetRect)
    const imgData32 = new Uint32Array(imageData.data.buffer)

    for (let i = 0; i < tileRects.length; i++) {
      const r = tileRects[i]
      const tileId = r.tileId

      for (let y = 0; y < r.h; y++) {
        // Source Y base for the 32-bit pixel buffer
        const srcY = r.srcY + y
        const srcYBase = srcY * imageData.width

        for (let x = 0; x < r.w; x++) {
          const srcX = r.srcX + x

          // 1. Check Mask: The mask index corresponds to the source image pixel index
          if (mask) {
            const maskIdx = srcYBase + srcX
            if (mask[maskIdx] === 0) continue
          }

          // 2. Read the pixel
          const si = srcYBase + srcX
          const packedColor = imgData32[si]

          // 3. Write to accumulator
          accumulator.addTilePacked(tileId, r.x + x, r.y + y, packedColor, blendFn)
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
    const sheetRect = { x, y, w, h, srcX: 0, srcY: 0 }
    const tileRects = state.tileSheet.splitRectIntoTileRects(sheetRect)

    for (let i = 0; i < tileRects.length; i++) {
      const r = tileRects[i]
      const tileId = r.tileId

      for (let ty = 0; ty < r.h; ty++) {
        const destY = r.y + ty
        // Calculate mask row start once per row
        let maskIdx = (r.srcY + ty) * sheetRect.w + r.srcX

        for (let tx = 0; tx < r.w; tx++) {
          if (mask && !mask[maskIdx++]) continue

          // Use addTilePacked directly with our constant
          accumulator.addTilePacked(tileId, r.x + tx, destY, PACKED_ERASE)

          if (!mask) maskIdx++ // keep incrementing if we are manually tracking even without mask
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
