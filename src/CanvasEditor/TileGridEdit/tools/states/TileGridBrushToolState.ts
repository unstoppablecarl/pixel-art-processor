import { MaskType } from '../../../../../../pixel-data-js/src'
import { type CanvasEditToolStore, useCanvasEditToolStore } from '../../../../lib/store/canvas-edit-tool-store.ts'
import type { TileId } from '../../../../lib/wang-tiles/WangTileset.ts'
import { useBrush } from '../../../_core/data/Brush.ts'
import { CanvasType } from '../../_tile-grid-editor-types.ts'
import type { TileSheetWriter } from '../../data/TileSheetWriter.ts'
import type { TileGridRenderer } from '../../renderers/TileGridRenderer.ts'
import type { TileGridEditorState } from '../../TileGridEditorState.ts'

export type TileGridBrushToolState = ReturnType<typeof makeTileGridBrushToolState>

export function makeTileGridBrushToolState(
  {
    state,
    tileSheetWriter,
    gridRenderer,
    store = useCanvasEditToolStore(),
  }: {
    state: TileGridEditorState
    tileSheetWriter: TileSheetWriter
    gridRenderer: TileGridRenderer
    store?: CanvasEditToolStore
  },
) {

  const brush = useBrush()

  function writeGrid(
    x: number,
    y: number,
    x2: number = x,
    y2: number = y,
  ) {
    const color = store.brushColor32
    const buffer = tileSheetWriter.tileGridPaintBuffer
    let affectedTileIds: TileId[]

    if (brush.data) {
      if (brush.type === MaskType.BINARY) {
        affectedTileIds = buffer.paintBinaryMask(color, brush, x, y, x2, y2)
      } else {
        affectedTileIds = buffer.paintAlphaMask(color, brush, x, y, x2, y2)
      }
    } else {
      affectedTileIds = buffer.paintRect(color, brush, x, y, x2, y2)
    }

    gridRenderer.queueRenderTiles(affectedTileIds)
  }

  function writeTile(
    tileId: TileId,
    x: number,
    y: number,
    x2: number = x,
    y2: number = y,
  ) {
    const color = store.brushColor32
    const buffer = tileSheetWriter.tilePaintBuffer
    let changed = false

    if (brush.data) {
      if (brush.type === MaskType.BINARY) {
        changed = buffer.paintBinaryMask(tileId, color, brush, x, y, x2, y2)
      } else {
        changed = buffer.paintAlphaMask(tileId, color, brush, x, y, x2, y2)
      }
    } else {
      changed = buffer.paintRect(tileId, color, brush, x, y, x2, y2)
    }

    if (changed) {
      gridRenderer.queueRenderTile(tileId)
    }
  }

  function writeBrush(
    x: number,
    y: number,
    canvasType: CanvasType,
    tileId?: TileId,
  ) {

    if (canvasType === CanvasType.GRID) {
      writeGrid(x, y)
    } else {
      writeTile(tileId!, x, y)
    }
  }

  function strokeBrush(
    x: number,
    y: number,
    x2: number,
    y2: number,
    canvasType: CanvasType,
    tileId?: TileId,
  ) {
    if (canvasType === CanvasType.GRID) {
      writeGrid(x, y, x2, y2)
    } else {
      writeTile(tileId!, x, y)
    }
  }

  return {
    writeBrush,
    strokeBrush,
    commit: () => {
      tileSheetWriter.paintBufferCommit()
    },
  }
}