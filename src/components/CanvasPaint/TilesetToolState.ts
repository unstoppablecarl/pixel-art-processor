import type { RectBounds } from '../../lib/util/data/Bounds.ts'
import { getRectsBounds } from '../../lib/util/data/Rect.ts'
import type { TileId } from '../../lib/wang-tiles/WangTileset.ts'
import { BlendMode, CanvasType } from './_canvas-editor-types.ts'
import type { TileGridManager } from './data/TileGridManager.ts'
import type { EditorState } from './EditorState.ts'
import {
  makeTileSheetSelection,
  mergeRectBounds,
  normalizeTileSheetRects,
  type SelectionCommitResult,
  type TileSheetSelection,
} from './lib/TileSheetSelection.ts'
import type { TileGridRenderer } from './renderers/TileGridRenderer.ts'
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

  // raw input for selection creation (grid/tile canvas coords)
  let dragStartX: number | null = null
  let dragStartY: number | null = null

  let dragCurrentX: number | null = null
  let dragCurrentY: number | null = null

  let inputSpace: CanvasType | null = null
  let inputTileId: TileId | null = null

  function clearRenderedSelection(sel: TileSheetSelection) {
    gridRenderer.queueRenderTiles(sel.getOverlappingTileIds())
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

    // ───────────────────────────────────────────────
    // TILE CANVAS SELECTION
    // ───────────────────────────────────────────────
    if (inputSpace === CanvasType.TILE) {
      const { x: sx, y: sy } =
        state.tileSheet.tileLocalToSheet(inputTileId!, x1, y1)

      const tileSheetBounds = { x: sx, y: sy, w, h }

      const tileSheetRects = state.tileSheet.tileLocalRectToTileSheetRect(
        inputTileId!,
        { x: x1, y: y1, w, h },
        tileSheetBounds,
      )

      if (tileSheetRects.length === 0) return null

      return makeTileSheetSelection(
        tileSheetRects,
        tileSheetBounds,
        null,               // no gridBounds for tile canvas
      )
    }

    // ───────────────────────────────────────────────
    // GRID CANVAS SELECTION
    // ───────────────────────────────────────────────
    if (inputSpace === CanvasType.GRID) {
      // 1. The user's drag rectangle in GRID PIXEL SPACE
      const gridBounds = { x: x1, y: y1, w, h }

      // 2. Convert to tileSheet rects (tileSheet pixel space)
      const rects = tileGridManager.gridRectToTileSheetRects(gridBounds)
      if (rects.length === 0) return null

      const { tileSheetBounds, normalizedRects } = normalizeTileSheetRects(rects)

      return makeTileSheetSelection(
        normalizedRects,
        tileSheetBounds,
        gridBounds,
      )
    }

    throw new Error('invalid canvas type: ' + inputSpace)
  }

  function startSelection(
    x: number,
    y: number,
    canvasType: CanvasType,
    tileId: TileId | null = null,
  ) {
    if (selection) clearRenderedSelection(selection)

    selecting = true
    dragging = false
    inputSpace = canvasType
    inputTileId = tileId

    dragStartX = x
    dragStartY = y
    dragCurrentX = x
    dragCurrentY = y
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

    gridRenderer.queueRenderAll()
  }

  function finalizeSelection() {
    if (!selecting) return
    if (dragStartX == null || dragStartY == null) return
    if (dragCurrentX == null || dragCurrentY == null) return

    selection = makeSelectionFromInput()

    clearState()
  }

  function clearState() {
    selecting = false
    dragging = false

    dragStartX = null
    dragStartY = null
    dragCurrentX = null
    dragCurrentY = null
    inputTileId = null

    // clear drag-move state on the selection, but keep the selection itself
    if (selection) {
      selection.dragMoveStartGridX = null
      selection.dragMoveStartGridY = null
    }
  }

  function dragStart(x: number, y: number) {
    if (!selection) return

    dragging = true

    console.log({
      LOG_NAME: 'dragStart',
      x,
      y,
      'selection.gridBounds.x': selection.gridBounds!.x,
      'selection.gridBounds.y': selection.gridBounds!.y,
    })

    if (selection.gridBounds) {
      selection.dragMoveStartGridX = x - selection.gridBounds.x
      selection.dragMoveStartGridY = y - selection.gridBounds.y
    } else {
      selection.dragMoveStartGridX = null
      selection.dragMoveStartGridY = null
    }
  }

  function dragEnd() {
    dragging = false
    if (selection) {
      selection.dragMoveStartGridX = null
      selection.dragMoveStartGridY = null
    }
  }

  function moveSelectionOnGrid(x: number, y: number) {
    if (!selection || !dragging) return

    const igb = selection.initialGridBounds!

    const newX = x - selection.dragMoveStartGridX!
    const newY = y - selection.dragMoveStartGridY!

    // gridBounds is where the selection *is now* in grid space
    selection.gridBounds = {
      x: newX,
      y: newY,
      w: igb.w,
      h: igb.h,
    }

    // offsets are relative to the original grid position
    selection.offsetX = newX - igb.x
    selection.offsetY = newY - igb.y

    const movedGridRect = selection.gridBounds
    selection.currentRects = tileGridManager.gridRectToTileSheetRects(movedGridRect)

    gridRenderer.queueRenderAll()
  }

  function tilePointInSelection(tileId: TileId, tx: number, ty: number) {
    if (!selection) return false
    const inside = state.tileSheet.tilePointInTileSheetSelection(tileId, tx, ty, selection)
    console.log({
      LOG_NAME: 'tileInSelection',
      tileId,
      tx,
      ty,
      inside,
    })
    return inside
  }

  function gridPointInSelection(gx: number, gy: number) {
    if (!selection) return false
    const inside = tileGridManager.gridPointInTileSheetSelection(gx, gy, selection)
    console.log({
      LOG_NAME: 'gridInSelection',
      gx,
      gy,
      inside,
    })
    return inside
  }

  function computeCommitRects(): SelectionCommitResult {
    if (!selection) throw new Error('no selection')

    const gb = selection.gridBounds

    // If no movement, just return current rects
    if (!gb) {
      const rects = selection.currentRects.map(r => ({ ...r }))
      const bounds = getRectsBounds(rects)
      return { rects, bounds }
    }

    console.log({
      LOG_NAME: 'computeCommitRects',
      selection,
    })

    // Re-split the moved selection across tiles
    const rects = tileGridManager.gridRectToTileSheetRects(gb)
    // Tight bounding box of the moved selection
    const bounds = getRectsBounds(rects)

    console.log({
      LOG_NAME: 'computeCommitRects result',
      rects,
      bounds,
    })
    return { rects, bounds }
  }

  function executeCommit({ rects }: SelectionCommitResult, pixels: ImageData, mode: BlendMode) {
    const movedTileIds = new Set<TileId>()

    for (const r of rects) {
      tileSheetWriter.blendTileSheetRectFromGrid(r, pixels, mode, selection!)
      movedTileIds.add(r.tileId)
    }

    if (selection) {
      selection.dragMoveStartGridX = null
      selection.dragMoveStartGridY = null
    }

    gridRenderer.queueRenderTiles([...movedTileIds])
    gridRenderer.queueRenderGrid()
  }

  function commit(mode: BlendMode) {
    if (!selection) return

    const pixels = selection.toPixels(state.tileSheet)

    const commitRects = computeCommitRects()

    executeCommit(commitRects, pixels, mode)

    selection = null
    dragging = false
  }

  function selectionGridSpaceMergedRects(): RectBounds[] {
    if (!selection) throw new Error('no selection')
    const projected: RectBounds[] = []
    for (const r of selection.originalRects) {
      projected.push(...tileGridManager.projectTileSheetRectToGridRects(r))
    }

    return mergeRectBounds(projected)
  }

  function clearSelection() {
    clearState()
    selection = null
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
    dragEnd,
    moveSelectionOnGrid,
    moveSelection: (x: number, y: number) => {
      console.log({
        LOG_NAME: 'moveSelection (TILE canvas, unused for now)',
        x,
        y,
      })
    },
    tileInSelection: tilePointInSelection,
    gridInSelection: gridPointInSelection,
    selectionGridSpaceMergedRects,
    commit,
    clearSelection,
    computeCommitRects,
    executeCommit,
  }
}
