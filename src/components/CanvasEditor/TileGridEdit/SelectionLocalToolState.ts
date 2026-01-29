import type { RectBounds } from '../../../lib/util/data/Bounds.ts'
import { extractImageData } from '../../../lib/util/html-dom/ImageData.ts'
import type { TileId } from '../../../lib/wang-tiles/WangTileset.ts'
import { BlendMode } from '../_canvas-editor-types.ts'
import { CanvasType } from './_tile-grid-editor-types.ts'
import type { TileGridManager } from './data/TileGridManager.ts'
import type { TileGridEditorState } from './TileGridEditorState.ts'
import {
  makeGridSelection,
  makeTileSelection,
  mergeRectBounds,
  normalizeTileSheetRects,
  type SelectionTileSheetRect,
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
    state: TileGridEditorState,
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

  // drag move selection anchors
  let dragStartGridBounds: RectBounds | null
  let dragStartSheetRects: SelectionTileSheetRect[] | null = null

  function clearRenderedSelection(sel: TileSheetSelection) {
    gridRenderer.queueRenderTiles(sel.getOverlappingTileIds())
    gridRenderer.queueRenderGrid()
  }

  function makeGridSelectionFromGridBounds(gridBounds: RectBounds) {
    const rects = tileGridManager.gridRectToTileSheetRects(gridBounds)
    if (rects.length === 0) throw new Error('no rects')

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

      // 1. Convert tile-local selection to sheet rect
      const r = state.tileSheet.tileLocalRectToTileSheetRect(
        inputTileId!,
        localBounds,
      )

      // 2. Tile-origin selections have exactly one rect
      const tileSheetBounds = {
        x: r.x,
        y: r.y,
        w: r.w,
        h: r.h,
      }

      // 3. Rect normalized relative to itself
      const normalizedRect = {
        ...r,
        srcX: 0,
        srcY: 0,
        bufferX: 0,
        bufferY: 0,
      }

      // 4. Extract pixels from the sheet-space bounding box
      const pixels = state.tileSheet.extractImageData(
        tileSheetBounds.x,
        tileSheetBounds.y,
        tileSheetBounds.w,
        tileSheetBounds.h,
      )

      // 5. Create selection
      return makeTileSelection(
        pixels,
        [normalizedRect],
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
    dragStartSheetRects = null
    dragStartGridBounds = null

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

    dragging = true

    selection.dragMoveStartGridX = mouseGridX
    selection.dragMoveStartGridY = mouseGridY

    dragStartGridBounds = selection.gridBounds
      ? { ...selection.gridBounds }
      : null

    // Anchor sheet rects for both origins
    dragStartSheetRects = selection.currentRects.map(r => ({ ...r }))

    // For TILE-origin, also compute sheet-space mouse anchor
    if (selection.origin === CanvasType.TILE) {
      const r = tileGridManager.gridPixelToTileSheetPixel(mouseGridX, mouseGridY)
      if (r) {
        selection.dragMoveStartSheetX = r.x
        selection.dragMoveStartSheetY = r.y
      }
    }
  }

  function moveSelectionOnGrid(mouseGridX: number, mouseGridY: number) {
    if (!selection) return

    // GRID-ORIGIN → grid-pixel movement
    if (selection.origin === CanvasType.GRID) {
      if (
        selection.dragMoveStartGridX == null ||
        selection.dragMoveStartGridY == null ||
        !dragStartGridBounds
      ) return

      const dx = mouseGridX - selection.dragMoveStartGridX
      const dy = mouseGridY - selection.dragMoveStartGridY

      const newGridBounds: RectBounds = {
        x: dragStartGridBounds.x + dx,
        y: dragStartGridBounds.y + dy,
        w: dragStartGridBounds.w,
        h: dragStartGridBounds.h,
      }

      selection.gridBounds = newGridBounds
      selection.currentRects = state.tileGridManager.gridRectToTileSheetRects(newGridBounds)
      return
    }

    // TILE-ORIGIN dragged on grid canvas → sheet-space movement
    if (selection.origin === CanvasType.TILE) {
      if (
        selection.dragMoveStartSheetX == null ||
        selection.dragMoveStartSheetY == null ||
        !dragStartSheetRects
      ) return

      const r = state.tileGridManager.gridPixelToTileSheetPixel(mouseGridX, mouseGridY)
      if (!r) return

      const { x: sheetX, y: sheetY } = r
      const dx = sheetX - selection.dragMoveStartSheetX
      const dy = sheetY - selection.dragMoveStartSheetY

      selection.currentRects = dragStartSheetRects.map(r => ({
        ...r,
        x: r.x + dx,
        y: r.y + dy,
      }))
    }
  }

  function tileDragStart(
    mouseLocalX: number,
    mouseLocalY: number,
    tileId: TileId,
  ) {
    if (!selection) return

    // Convert mouse → tilesheet space for stable anchoring
    const { x: sheetX, y: sheetY } = state.tileSheet.tileLocalToSheet(
      tileId,
      mouseLocalX,
      mouseLocalY,
    )

    selection.dragMoveStartSheetX = sheetX
    selection.dragMoveStartSheetY = sheetY

    // Snapshot rects in sheet-space
    dragStartSheetRects = selection.currentRects.map(r => ({ ...r }))

    // For grid-origin dragging on tile canvas, we also store tile-local
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

    // TILE-ORIGIN → sheet-space movement
    if (selection.origin === CanvasType.TILE) {
      if (
        selection.dragMoveStartSheetX == null ||
        selection.dragMoveStartSheetY == null ||
        !dragStartSheetRects
      ) return

      const { x: sheetX, y: sheetY } = state.tileSheet.tileLocalToSheet(
        tileId,
        mouseLocalX,
        mouseLocalY,
      )

      const dx = sheetX - selection.dragMoveStartSheetX
      const dy = sheetY - selection.dragMoveStartSheetY

      selection.currentRects = dragStartSheetRects.map(r => ({
        ...r,
        x: r.x + dx,
        y: r.y + dy,
      }))

      return
    }

    // GRID-ORIGIN → tile-local delta → grid bounds → tilesheet rects
    if (selection.origin === CanvasType.GRID) {
      if (
        selection.dragMoveStartTileLocalX == null ||
        selection.dragMoveStartTileLocalY == null ||
        !dragStartGridBounds
      ) return

      const dx = mouseLocalX - selection.dragMoveStartTileLocalX
      const dy = mouseLocalY - selection.dragMoveStartTileLocalY

      const newGridBounds: RectBounds = {
        x: dragStartGridBounds.x + dx,
        y: dragStartGridBounds.y + dy,
        w: dragStartGridBounds.w,
        h: dragStartGridBounds.h,
      }

      selection.gridBounds = newGridBounds
      selection.currentRects = state.tileGridManager.gridRectToTileSheetRects(newGridBounds)
    }
  }

  function promoteTileSelectionToGridOrigin() {
    if (!selection) return
    if (selection.origin === CanvasType.GRID) return

    if (selection.originalRects.length !== 1)
      throw new Error('expected only 1 rect for tile-origin selection')

    const originalSheetRect = selection.originalRects[0]
    const gridRects = tileGridManager.projectTileSheetRectToGridRects(originalSheetRect)
    if (gridRects.length === 0) return

    const gridBounds = gridRects[0]

    // recreate as grid-origin selection
    selection = makeGridSelectionFromGridBounds(gridBounds)

    // reset drag anchors
    dragStartGridBounds = { ...selection.gridBounds! }
    selection.dragMoveStartGridX = null
    selection.dragMoveStartGridY = null
  }

  function tilePointInSelection(tileId: TileId, tx: number, ty: number) {
    if (!selection) return false
    return state.tileSheet.tilePointInTileSheetSelection(tileId, tx, ty, selection)
  }

  function gridPointInSelection(gx: number, gy: number) {
    if (!selection) return false
    return tileGridManager.gridPointInTileSheetSelection(gx, gy, selection)
  }

  function commit(mode: BlendMode) {
    if (!selection) return

    const pixels = selection.pixels
    const movedTileIds = new Set<TileId>()

    // 1. Clear original footprint
    for (const r of selection.originalRects) {
      tileSheetWriter.clearRect(r.x, r.y, r.w, r.h)
    }

    // 2. Write moved selection
    for (const r of selection.currentRects) {

      tileSheetWriter.blendSheetImageData(
        pixels,
        mode,
        r.x,      // dest tilesheet X
        r.y,      // dest tilesheet Y
        r.bufferX,  // src X inside selection buffer
        r.bufferY,  // src Y inside selection buffer
        r.w,
        r.h,
      )

      movedTileIds.add(r.tileId)
    }

    selection.dragMoveStartGridX = null
    selection.dragMoveStartGridY = null

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
