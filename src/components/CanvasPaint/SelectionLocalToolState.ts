import type { RectBounds } from '../../lib/util/data/Bounds.ts'
import { extractImageData } from '../../lib/util/html-dom/ImageData.ts'
import type { TileId } from '../../lib/wang-tiles/WangTileset.ts'
import { BlendMode, CanvasType } from './_canvas-editor-types.ts'
import type { TileGridManager } from './data/TileGridManager.ts'
import type { EditorState } from './EditorState.ts'
import {
  makeGridSelection,
  makeTileSelection,
  mergeRectBounds,
  normalizeTileSheetRects,
  type TileSheetSelection,
} from './lib/TileSheetSelection.ts'
import type { TileGridRenderer } from './renderers/TileGridRenderer.ts'
import type { TileSheetWriter } from './TileSheetWriter.ts'

export type SelectionLocalToolState = ReturnType<typeof makeSelectionLocalToolState>

export function makeSelectionLocalToolState(
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

  function makeGridSelectionFromGridBounds(gridBounds: RectBounds) {
    const rects = tileGridManager.gridRectToTileSheetRects(gridBounds)
    if (rects.length === 0) return null

    const { tileSheetBounds, normalizedRects } = normalizeTileSheetRects(rects)

    const pixels = extractImageData(
      gridRenderer.tileGridImageDataRef.get()!,
      gridBounds.x,
      gridBounds.y,
      gridBounds.w,
      gridBounds.h,
    )

    return makeGridSelection(
      pixels,
      normalizedRects,
      tileSheetBounds,
      gridBounds,
    )
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
      const localBounds = { x: x1, y: y1, w, h }
      const { x: sx, y: sy } = state.tileSheet.tileLocalToSheet(inputTileId!, x1, y1)
      const tileSheetBounds = { x: sx, y: sy, w, h }

      const tileSheetRects = state.tileSheet.tileLocalRectToTileSheetRect(
        inputTileId!,
        localBounds,
      )

      if (tileSheetRects.length === 0) return null
      if (tileSheetRects.length !== 1) throw new Error('invalid tile selection')

      const pixels = tileSheetWriter.extractTileRect(inputTileId!, x1, y1, w, h)

      return makeTileSelection(
        pixels,
        tileSheetRects,
        tileSheetBounds,
        inputTileId!,
        localBounds,
      )
    }

    // ───────────────────────────────────────────────
    // GRID CANVAS SELECTION
    // ───────────────────────────────────────────────
    if (inputSpace === CanvasType.GRID) {
      // 1. The user's drag rectangle in GRID PIXEL SPACE
      const gridBounds = { x: x1, y: y1, w, h }

      // 2. Convert to tileSheet rects (tileSheet pixel space)
      return makeGridSelectionFromGridBounds(gridBounds)
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
    selection = null
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

  function dragEnd() {
    dragging = false
    if (selection) {
      selection.dragMoveStartGridX = null
      selection.dragMoveStartGridY = null
    }
  }

  function gridDragStart(
    mouseGridX: number,
    mouseGridY: number,
  ) {
    if (!selection) return
    if (selection.origin === CanvasType.TILE) {
      promoteTileSelectionToGridOrigin()
    }

    selection.dragMoveStartGridX = mouseGridX
    selection.dragMoveStartGridY = mouseGridY
    dragging = true
  }

  function moveSelectionOnGrid(
    mouseGridX: number,
    mouseGridY: number,
  ) {
    if (!selection) return
    if (!selection.gridBounds || !selection.initialGridBounds) return
    if (selection.dragMoveStartGridX == null || selection.dragMoveStartGridY == null) return

    const dx = mouseGridX - selection.dragMoveStartGridX
    const dy = mouseGridY - selection.dragMoveStartGridY

    // New grid bounds
    const newGridBounds: RectBounds = {
      x: selection.initialGridBounds.x + dx,
      y: selection.initialGridBounds.y + dy,
      w: selection.initialGridBounds.w,
      h: selection.initialGridBounds.h,
    }

    selection.gridBounds = newGridBounds
    selection.currentRects = tileGridManager.gridRectToTileSheetRects(newGridBounds)
  }

  function tileDragStart(
    mouseLocalX: number,
    mouseLocalY: number,
    tileId: TileId,
  ) {
    if (!selection) return
    selection.dragMoveStartTileLocalX = mouseLocalX
    selection.dragMoveStartTileLocalY = mouseLocalY
    dragging = true
  }

  function moveSelectionOnTile(
    mouseLocalX: number,
    mouseLocalY: number,
    tileId: TileId,
  ) {
    if (!selection) return

    if (selection.origin === CanvasType.TILE) {
      if (selection.origin !== CanvasType.TILE) return
      if (!selection.initialTileLocalBounds || selection.initialTileId == null) return
      if (selection.dragMoveStartTileLocalX == null || selection.dragMoveStartTileLocalY == null) return

      const dx = mouseLocalX - selection.dragMoveStartTileLocalX
      const dy = mouseLocalY - selection.dragMoveStartTileLocalY

      // New tile-local bounds
      const newLocalBounds: RectBounds = {
        x: selection.initialTileLocalBounds.x + dx,
        y: selection.initialTileLocalBounds.y + dy,
        w: selection.initialTileLocalBounds.w,
        h: selection.initialTileLocalBounds.h,
      }

      // Recompute rects from tile-local movement
      selection.currentRects = state.tileSheet.tileLocalRectToTileSheetRect(
        selection.initialTileId,
        newLocalBounds,
      )
    }
    if (selection.origin === CanvasType.GRID) {

      if (!selection.initialGridBounds || !selection.gridBounds) return
      if (selection.dragMoveStartTileLocalX == null || selection.dragMoveStartTileLocalY == null) return

      const dx = mouseLocalX - selection.dragMoveStartTileLocalX
      const dy = mouseLocalY - selection.dragMoveStartTileLocalY

      const newGridBounds: RectBounds = {
        x: selection.initialGridBounds.x + dx,
        y: selection.initialGridBounds.y + dy,
        w: selection.initialGridBounds.w,
        h: selection.initialGridBounds.h,
      }

      selection.gridBounds = newGridBounds
      selection.currentRects = state.tileGridManager.gridRectToTileSheetRects(newGridBounds)
    }
  }

  function promoteTileSelectionToGridOrigin() {
    if (!selection) return
    if (selection.origin === CanvasType.GRID) return

    if (selection.originalRects.length !== 1) throw new Error('expected only 1 rect')

    const originalSheetRect = selection.originalRects[0]
    const gridRects = tileGridManager.projectTileSheetRectToGridRects(originalSheetRect)

    // if there are multiple need to select just one doesn't matter which
    const gridBounds = gridRects[0]

    selection = makeGridSelectionFromGridBounds(gridBounds)
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

  function commit(mode: BlendMode) {
    if (!selection) return

    const pixels = selection.pixels
    const movedTileIds = new Set<TileId>()

    for (const r of selection.originalRects) {
      tileSheetWriter.clearRect(r.x, r.y, r.w, r.h)
    }

    for (const r of selection.currentRects) {

      tileSheetWriter.blendSheetImageData(
        pixels,
        mode,
        r.x,      // dest tilesheet X
        r.y,      // dest tilesheet Y
        r.bufferX,     // src X inside selection buffer
        r.bufferY,     // src Y inside selection buffer
        r.w,
        r.h,
      )

      movedTileIds.add(r.tileId)
    }

    if (selection) {
      selection.dragMoveStartGridX = null
      selection.dragMoveStartGridY = null
    }

    gridRenderer.queueRenderTiles([...movedTileIds])
    gridRenderer.queueRenderGrid()

    selection = null
    dragging = false
  }

  function selectionGridSpaceMergedRects(): RectBounds[] {
    if (!selection) throw new Error('no selection')
    const projected: RectBounds[] = []
    for (const r of selection.currentRects) {
      projected.push(...tileGridManager.projectTileSheetRectToGridRects(r))
    }

    return mergeRectBounds(projected)
  }

  function clearSelection() {
    const tileIds = selection?.getOverlappingTileIds() ?? []
    clearState()
    selection = null

    gridRenderer.queueRenderTiles(tileIds)
    gridRenderer.queueRenderGrid()
  }

  function draw() {
    const tileIds = selection?.getOverlappingTileIds() ?? []

    gridRenderer.queueRenderTiles(tileIds)
    gridRenderer.queueRenderGrid()
  }

  return {
    get inputTileId() {
      return inputTileId
    },

    get isTileSelection() {
      return inputSpace === CanvasType.TILE
    },

    get currentDraggedRect(): RectBounds | undefined {
      if (dragCurrentX !== null && dragCurrentY !== null && dragStartX !== null && dragStartY !== null) {
        return {
          x: dragStartX,
          y: dragStartY,
          w: dragCurrentX - dragStartX,
          h: dragCurrentY - dragStartY,
        }
      }
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
    draw,
    tileStartSelection,
    gridStartSelection,
    updateSelection,
    finalizeSelection,

    gridDragStart,
    tileDragStart,
    dragEnd,
    moveSelectionOnGrid,
    moveSelectionOnTile,
    tilePointInSelection,
    gridPointInSelection,
    selectionGridSpaceMergedRects,
    commit,
    clearSelection,
    promoteTileSelectionToGridOrigin,
  }
}
