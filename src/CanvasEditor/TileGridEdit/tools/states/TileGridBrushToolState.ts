import { destinationOutPerfect, MaskType, packColor } from 'pixel-data-js'
import { type CanvasEditToolStore, useCanvasEditToolStore } from '../../../../lib/store/canvas-edit-tool-store.ts'
import type { TileId } from '../../../../lib/wang-tiles/WangTileset.ts'
import { SubTools, Tool } from '../../../_core/_core-editor-types.ts'
import { useBrush } from '../../../_core/data/Brush.ts'
import { CanvasType } from '../../_tile-grid-editor-types.ts'
import type { TileSheetWriter } from '../../data/TileSheetWriter.ts'
import type { TileGridRenderer } from '../../renderers/TileGridRenderer.ts'
import type { TileGridEditorState } from '../../TileGridEditorState.ts'

export type TileGridBrushToolState = ReturnType<typeof makeTileGridBrushToolState>
const ERASE = packColor(255, 0, 0, 255)

const ERASE_SUB_TOOL = SubTools[Tool.BRUSH].REMOVE

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

  function writeGrid(
    x: number,
    y: number,
    x2: number = x,
    y2: number = y,
  ) {
    const brush = useBrush()

    const buffer = tileSheetWriter.tileGridPaintBuffer
    let affectedTileIds: TileId[]
    const eraseMode = store.currentSubTool === ERASE_SUB_TOOL
    const color = eraseMode ? ERASE : store.brushColor

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
    const color = store.brushColor
    const buffer = tileSheetWriter.tilePaintBuffer
    let changed: boolean
    const brush = useBrush()

    if (brush.data) {
      const eraseMode = store.currentSubTool === ERASE_SUB_TOOL
      const color = eraseMode ? ERASE : store.brushColor

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
      writeTile(tileId!, x, y, x2, y2)
    }
  }

  return {
    writeBrush,
    strokeBrush,
    commit: () => {
      if (store.currentSubTool === ERASE_SUB_TOOL) {
        tileSheetWriter.paintBufferCommit(255, destinationOutPerfect)
      } else {
        tileSheetWriter.paintBufferCommit()
      }
    },
    drawTile(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, tileId: TileId) {
      if (store.currentSubTool === ERASE_SUB_TOOL) {
        tileSheetWriter.tilePaintBufferDraw(ctx, tileId, 255, 'destination-out')
      } else {
        tileSheetWriter.tilePaintBufferDraw(ctx, tileId)
      }
    },
    drawGrid(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) {
      if (store.currentSubTool === ERASE_SUB_TOOL) {
        tileSheetWriter.tileGridPaintBufferDraw(ctx, 255, 'destination-out')
      } else {
        tileSheetWriter.tileGridPaintBufferDraw(ctx)
      }
    },
  }
}