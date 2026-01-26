import type { RectBounds } from '../../lib/util/data/Bounds.ts'
import type { TileId } from '../../lib/wang-tiles/WangTileset.ts'
import { BlendMode, CanvasType } from './_canvas-editor-types.ts'
import type { TileGridManager } from './data/TileGridManager.ts'
import type { EditorState } from './EditorState.ts'
import {
  makeTileSheetSelection,
  mergeRectBounds,
  type TileSheetRect,
  type TileSheetSelection,
} from './lib/TileSheetSelection.ts'
import type { TileGridRenderer } from './TileGridRenderer.ts'
import type { TileSheetWriter } from './TileSheetWriter.ts'

export type TilesetToolState = ReturnType<typeof makeTilesetToolState>

export function makeTilesetToolState(
  {
    state,
    tileSheetWriter,
    gridRenderer,
    tileGridManager,
  }: {
    state: EditorState,
    tileSheetWriter: TileSheetWriter
    gridRenderer: TileGridRenderer
    tileGridManager: TileGridManager
  }) {
  let selection: TileSheetSelection | null = null

  let selecting = false
  let dragging = false

  // grid/tile canvas coords
  let dragStartX: number | null = null
  let dragStartY: number | null = null

  let dragCurrentX: number | null = null
  let dragCurrentY: number | null = null

  let inputSpace: CanvasType | null = null
  let inputTileId: TileId | null = null

  function clearRenderedSelection(sel: TileSheetSelection) {
    // Project all current rects to find affected tiles
    const tileIds = new Set<TileId>()
    for (const r of sel.currentRects) {
      tileIds.add(r.tileId)
    }
    gridRenderer.queueRenderTiles([...tileIds])
    gridRenderer.queueRenderGrid()
  }

  function makeSelectionFromInput() {
    if (!inputSpace) return null
    if (dragStartX == null || dragStartY == null) return null
    if (dragCurrentX == null || dragCurrentY == null) return null

    const x1 = Math.min(dragStartX, dragCurrentX)
    const y1 = Math.min(dragStartY, dragCurrentY)
    const x2 = Math.max(dragStartX, dragCurrentX)
    const y2 = Math.max(dragStartY, dragCurrentY)

    const w = x2 - x1
    const h = y2 - y1
    if (w <= 0 || h <= 0) return null

    let bounds: RectBounds
    let tileSheetRects: TileSheetRect[] = []

    if (inputSpace === CanvasType.TILE) {

      const { tileX, tileY } = state.tileSheet.getTileCoords(inputTileId!)
      const sheetOriginX = tileX * state.tileSize
      const sheetOriginY = tileY * state.tileSize

      bounds = {
        x: sheetOriginX + x1,
        y: sheetOriginY + y1,
        w,
        h,
      }

      tileSheetRects =
        state.tileSheet.tileLocalRectToTileSheetRect(
          inputTileId!,
          { x: x1, y: y1, w, h },
          bounds,
        )
    } else if (inputSpace === CanvasType.GRID) {
      bounds = { x: x1, y: y1, w, h }

      tileSheetRects = tileGridManager.gridRectToTileSheetRects(
        bounds,
        bounds,
      )
    } else {
      throw new Error('invalid canvas type: ' + inputSpace)
    }

    if (tileSheetRects.length === 0) return null

    return makeTileSheetSelection(tileSheetRects, bounds)
  }

  function startSelection(tx: number, ty: number, canvasType: CanvasType, tileId: TileId | null = null) {
    console.log('START SELECTION', { x: tx, y: ty, tileId })
    if (selection) clearRenderedSelection(selection)

    selecting = true
    dragging = false
    inputSpace = canvasType
    inputTileId = tileId

    dragStartX = tx
    dragStartY = ty
    dragCurrentX = tx
    dragCurrentY = ty
  }

  function tileStartSelection(tileId: TileId, tx: number, ty: number) {
    startSelection(tx, ty, CanvasType.TILE, tileId)
  }

  function gridStartSelection(gx: number, gy: number) {
    startSelection(gx, gy, CanvasType.GRID)
  }

  function updateSelection(x: number, y: number) {
    if (!selecting) return
    dragCurrentX = x
    dragCurrentY = y
  }

  function finalizeSelection() {

    if (!selecting) return
    if (dragStartX == null || dragStartY == null) return
    if (dragCurrentX == null || dragCurrentY == null) return

    selection = makeSelectionFromInput()

    selecting = false
    dragging = false

    dragStartX = null
    dragStartY = null
    dragCurrentX = null
    dragCurrentY = null
    inputTileId = null
  }

  function dragStart(x: number, y: number) {
    if (!selection) return
    dragging = true
    dragStartX = x
    dragStartY = y
  }

  function moveSelection(gx: number, gy: number) {
    if (!selection || !dragging) return
    if (dragStartX == null || dragStartY == null) return
    const dx = gx - dragStartX
    const dy = gy - dragStartY
    selection.move(dx, dy)
  }

  function tileInSelection(tileId: TileId, tx: number, ty: number) {
    if (!selection) return false
    return state.tileSheet.tilePointInTileSheetSelection(tileId, tx, ty, selection)
  }

  function gridInSelection(gx: number, gy: number) {
    if (!selection) return false
    return tileGridManager.gridPointInTileSheetSelection(gx, gy, selection)
  }

  function commit(mode: BlendMode) {
    if (!selection) return

    // Clear original pixels
    for (const r of selection.originalRects) {
      state.tileSheet.clearTileSheetRect(r)
    }

    // Write moved pixels
    const pixels = selection.toPixels(state.tileSheet)
    for (const r of selection.currentRects) {
      tileSheetWriter.blendTileSheetRect(r, pixels, mode)
    }

    // Re-render affected tiles
    const tileIds = new Set(selection.currentRects.map(r => r.tileId))
    gridRenderer.queueRenderTiles([...tileIds])
    gridRenderer.queueRenderGrid()

    selection = null
    dragging = false
  }

  function selectionGridSpaceMergedRects(): RectBounds[] {
    if (!selection) throw new Error('no selection')
    const projected = []
    for (const r of selection.currentRects) {
      projected.push(...tileGridManager.projectTileSheetRectToGridRects(r))
    }

    return mergeRectBounds(projected)
  }

  return {
    get dragStartX() {
      return dragStartX
    },
    get dragStartY() {
      return dragStartY
    },
    get selection() {
      return selection
    },

    get selecting() {
      return selecting
    },
    get dragging() {
      return dragging
    },

    selectionHasMoved() {
      return selection?.hasMoved ?? false
    },

    tileStartSelection,
    gridStartSelection,
    updateSelection,
    finalizeSelection,

    dragStart,
    moveSelection,

    tileInSelection,
    gridInSelection,
    selectionGridSpaceMergedRects,
    commit,
  }
}
