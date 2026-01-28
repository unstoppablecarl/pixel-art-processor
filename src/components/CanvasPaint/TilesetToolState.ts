import type { RectBounds } from '../../lib/util/data/Bounds.ts'
import { getRectsBounds } from '../../lib/util/data/Rect.ts'
import type { TileId } from '../../lib/wang-tiles/WangTileset.ts'
import { BlendMode, CanvasType } from './_canvas-editor-types.ts'
import type { TileGridManager } from './data/TileGridManager.ts'
import type { EditorState } from './EditorState.ts'
import {
  makeTileSheetSelection,
  mergeRectBounds,
  type SelectionCommitResult,
  type TileSheetRect,
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

    let bounds: RectBounds
    let tileSheetRects: TileSheetRect[] = []

    // ───────────────────────────────────────────────
    // TILE CANVAS SELECTION
    // ───────────────────────────────────────────────
    if (inputSpace === CanvasType.TILE) {
      const { x: sx, y: sy } =
        state.tileSheet.tileLocalToSheet(inputTileId!, x1, y1)

      bounds = { x: sx, y: sy, w, h }

      tileSheetRects = state.tileSheet.tileLocalRectToTileSheetRect(
        inputTileId!,
        { x: x1, y: y1, w, h },
        bounds,
      )

      if (tileSheetRects.length === 0) return null

      // TILE selection → no grid bounds yet
      return makeTileSheetSelection(
        tileSheetRects,
        bounds,
      )
    }

    // ───────────────────────────────────────────────
    // GRID CANVAS SELECTION
    // ───────────────────────────────────────────────
    if (inputSpace === CanvasType.GRID) {
      const gridRect = { x: x1, y: y1, w, h }

      const rects = tileGridManager.gridRectToTileSheetRects(gridRect)
      if (rects.length === 0) return null

      bounds = getRectsBounds(rects)

      const normalized = tileGridManager.applyBoundsOrigin(rects, bounds)

      const tileSheetRects = normalized.map((r, i) => ({
        ...r,
        tileX: rects[i].tileX,
        tileY: rects[i].tileY,
        gridX: rects[i].gridX,
        gridY: rects[i].gridY,
      }))

      // Project into grid space to compute gridBounds
      const projected: RectBounds[] = []
      for (const r of tileSheetRects) {
        projected.push(...tileGridManager.projectTileSheetRectToGridRects(r))
      }

      const gridBounds = getRectsBounds(projected)

      return makeTileSheetSelection(
        tileSheetRects,
        bounds,
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
    const { tileGridManager } = state
    if (!selection) throw new Error('no selection')

    const gb = selection.gridBounds
    const igb = selection.initialGridBounds

    // TILE-ONLY PATH
    if (!gb || !igb) {

      const rects = selection.currentRects.map(r => ({ ...r }))
      const bounds = getRectsBounds(rects)
      return { rects, bounds }
    }

    // GRID MOVEMENT PATH
    const rawDx = gb.x - igb.x
    const rawDy = gb.y - igb.y

    const gridDx = rawDx
    const gridDy = rawDy

    const rects = []

    for (const orig of selection.originalRects) {
      // 1. tileSheet → grid
      const projected = tileGridManager.projectTileSheetRectToGridRects(orig)
      // first is always the rect mapped to the selection
      const base = projected[0]

      const origGX = base.x
      const origGY = base.y

      // 2. apply tile-snapped movement
      const newGX = origGX + gridDx
      const newGY = origGY + gridDy

      const r = tileGridManager.gridPixelToTileSheetPixel(newGX, newGY)
      if (!r) continue

      const { x, y, tileId, tileLocalX: localX, tileLocalY: localY } = r
      rects.push({
        x,
        y,
        w: base.w,
        h: base.h,
        tileId: tileId,
        gridX: newGX,
        gridY: newGY,
        tileX: localX,
        tileY: localY,
      })
    }

    const bounds = getRectsBounds(rects)
    return { rects, bounds }
  }

  function renderCommitPreview(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = 'lime'
    ctx.lineWidth = 1

    const { rects } = computeCommitRects()
    for (const r of rects) {
      ctx.strokeRect(
        r.x * state.scale + 0.5,
        r.y * state.scale + 0.5,
        r.w * state.scale - 1,
        r.h * state.scale - 1,
      )
    }
  }

  function executeCommit({ rects, bounds }: SelectionCommitResult, pixels: ImageData, mode: BlendMode) {
    const movedTileIds = new Set<TileId>()

    for (const r of rects) {
      tileSheetWriter.blendTileSheetRect(r, pixels, mode, bounds)
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
    renderCommitPreview,
    executeCommit,
  }
}
