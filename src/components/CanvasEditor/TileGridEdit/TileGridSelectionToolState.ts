import { type CanvasEditToolStore, useCanvasEditToolStore } from '../../../lib/store/canvas-edit-tool-store.ts'
import { getRectsBounds, type Rect } from '../../../lib/util/data/Rect.ts'
import {
  extractImageData,
  floodFillImageDataSelection,
  type FloodFillResult,
} from '../../../lib/util/html-dom/ImageData.ts'
import type { TileId } from '../../../lib/wang-tiles/WangTileset.ts'
import { BlendMode, SelectSubTool } from '../_core-editor-types.ts'
import { CanvasType } from './_tile-grid-editor-types.ts'
import type { TileGridManager } from './data/TileGridManager.ts'
import {
  makeGridSelection,
  makeTileSelection,
  mergeAdjacentRects,
  normalizeTileSheetRects,
  type SelectionTileSheetRect,
  type TileSheetSelection,
} from './lib/TileSheetSelection.ts'
import type { TileGridRenderer } from './renderers/TileGridRenderer.ts'
import type { TileGridEditorState } from './TileGridEditorState.ts'
import type { TileSheetWriter } from './TileSheetWriter.ts'

export type TileGridSelectionToolState = ReturnType<typeof makeTileGridSelectionToolState>

export function makeTileGridSelectionToolState(
  {
    state,
    tileSheetWriter,
    gridRenderer,
    tileGridManager,
    store = useCanvasEditToolStore(),
  }: {
    state: TileGridEditorState,
    tileSheetWriter: TileSheetWriter
    gridRenderer: TileGridRenderer
    tileGridManager: TileGridManager,
    store: CanvasEditToolStore
  }) {
  let selection: TileSheetSelection | null = null

  // true during the initial drag that defines a selection rectangle.
  let selecting = false

  // moving an existing selection
  let dragging = false

  // raw input for selection rect creation (grid/tile canvas coords)
  let dragStartX: number | null = null
  let dragStartY: number | null = null

  let dragCurrentX: number | null = null
  let dragCurrentY: number | null = null

  let inputSpace: CanvasType | null = null
  let inputTileId: TileId | null = null

  // drag move selection anchors
  let dragMoveStartGridBounds: Rect | null
  let dragMoveStartSheetRects: SelectionTileSheetRect[] | null = null

  function clearRenderedSelection(sel: TileSheetSelection) {
    gridRenderer.queueRenderTiles(sel.getOverlappingTileIds())
    gridRenderer.queueRenderGrid()
  }

  function makeGridSelectionFromGridBounds(gridBounds: Rect) {
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

  function finalizeFloodSelection(
    x: number,
    y: number,
    canvasType: CanvasType,
    tileId: TileId | null = null,
  ) {
    let result: FloodFillResult | null = null

    // ───────────────────────────────────────────────
    // TILE CANVAS FLOOD-FILL
    // ───────────────────────────────────────────────
    if (canvasType === CanvasType.TILE) {
      const tileImg = state.tileSheet.extractTile(tileId!)
      if (!tileImg) return

      result = floodFillImageDataSelection(
        tileImg,
        x,
        y,
        store.selectFloodContiguous,
        store.selectFloodTolerance,
      )
      if (!result) return

      // Convert tile-local rect → sheet-space rect
      const sheetRect = state.tileSheet.tileLocalRectToTileSheetRect(tileId!, result.rect)

      // Build TILE-origin selection
      selection = makeTileSelection(
        result.pixels,
        [{
          ...sheetRect,
          gridX: null,
          gridY: null,
          bufferX: 0,
          bufferY: 0,
          mask: result.mask,
        }],
        sheetRect,
        tileId!,
        result.rect,
        { x, y },
      )

      clearState()
      gridRenderer.queueRenderGrid()
      return
    }

    // ───────────────────────────────────────────────
    // GRID CANVAS FLOOD-FILL
    // ───────────────────────────────────────────────
    const gridImg = gridRenderer.tileGridImageDataRef.get()
    if (!gridImg) return

    result = floodFillImageDataSelection(
      gridImg,
      x,
      y,
      store.selectFloodContiguous,
      store.selectFloodTolerance,
    )
    if (!result) return

    // Convert flood rect (grid-local) → tile-sheet rects
    const rects = tileGridManager.gridRectToTileSheetRects(result.rect)
    if (rects.length === 0) return

    // Normalize rects (compute srcX/srcY/bufferX/bufferY)
    const { tileSheetBounds, normalizedRects } = normalizeTileSheetRects(rects)

    // Split flood mask into per-rect masks
    const rectMasks = splitMaskForRects(
      result.mask,
      result.rect,
      normalizedRects,
      state.tileGridManager,
    )

    normalizedRects.forEach((r, i) => {
      r.mask = rectMasks[i]
    })

    // Build GRID-origin selection
    selection = makeGridSelection(
      result.pixels,
      normalizedRects,
      tileSheetBounds,
      result.rect,
      { x, y },
    )

    clearState()
    gridRenderer.queueRenderGrid()
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
    dragMoveStartSheetRects = null
    dragMoveStartGridBounds = null

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

    dragMoveStartGridBounds = selection.gridBounds
      ? { ...selection.gridBounds }
      : null

    // Anchor sheet rects for both origins
    dragMoveStartSheetRects = selection.currentRects.map(r => ({ ...r }))

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
    // ───────────────────────────────────────────────
    // GRID‑ORIGIN SELECTION
    // ───────────────────────────────────────────────
    if (selection.origin === CanvasType.GRID) {
      if (
        selection.dragMoveStartGridX == null ||
        selection.dragMoveStartGridY == null ||
        !dragMoveStartGridBounds ||
        !dragMoveStartSheetRects
      ) return

      // Compute delta in GRID PIXELS
      const dx = mouseGridX - selection.dragMoveStartGridX
      const dy = mouseGridY - selection.dragMoveStartGridY

      // Move the grid bounds
      selection.gridBounds = {
        x: dragMoveStartGridBounds.x + dx,
        y: dragMoveStartGridBounds.y + dy,
        w: dragMoveStartGridBounds.w,
        h: dragMoveStartGridBounds.h,
      }

      // Move the sheet‑space rects WITHOUT regenerating them
      // This preserves mask, bufferX/bufferY, srcX/srcY, tileId, tileX/tileY
      selection.currentRects = dragMoveStartSheetRects.map(r => ({
        ...r,
        x: r.x + dx,
        y: r.y + dy,
      }))


      console.log(JSON.stringify({
        LOG_NAME: 'MOVE currentRects',
        currentRects: selection.currentRects.map(r => ({ x: r.x, y: r.y, w: r.w, h: r.h })),
      }))

      // Recompute gridBounds from moved rects
      const projected = []
      for (const r of selection.currentRects) {
        projected.push(...tileGridManager.projectTileSheetRectToGridRects(r))
      }

      selection.gridBounds = getRectsBounds(projected)

      return
    }

    // ───────────────────────────────────────────────
    // TILE‑ORIGIN SELECTION DRAGGED ON GRID CANVAS
    // (movement is in sheet‑space)
    // ───────────────────────────────────────────────
    if (selection.origin === CanvasType.TILE) {
      if (
        selection.dragMoveStartSheetX == null ||
        selection.dragMoveStartSheetY == null ||
        !dragMoveStartSheetRects
      ) return

      // Convert mouse → tilesheet pixel
      const hit = state.tileGridManager.gridPixelToTileSheetPixel(mouseGridX, mouseGridY)
      if (!hit) return

      const dx = hit.x - selection.dragMoveStartSheetX
      const dy = hit.y - selection.dragMoveStartSheetY

      // Move rects in sheet‑space
      selection.currentRects = dragMoveStartSheetRects.map(r => ({
        ...r,
        x: r.x + dx,
        y: r.y + dy,
      }))

      return
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
    dragMoveStartSheetRects = selection.currentRects.map(r => ({ ...r }))

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
        !dragMoveStartSheetRects
      ) return

      const { x: sheetX, y: sheetY } = state.tileSheet.tileLocalToSheet(
        tileId,
        mouseLocalX,
        mouseLocalY,
      )

      const dx = sheetX - selection.dragMoveStartSheetX
      const dy = sheetY - selection.dragMoveStartSheetY

      selection.currentRects = dragMoveStartSheetRects.map(r => ({
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
        !dragMoveStartGridBounds
      ) return

      const dx = mouseLocalX - selection.dragMoveStartTileLocalX
      const dy = mouseLocalY - selection.dragMoveStartTileLocalY

      const newGridBounds: Rect = {
        x: dragMoveStartGridBounds.x + dx,
        y: dragMoveStartGridBounds.y + dy,
        w: dragMoveStartGridBounds.w,
        h: dragMoveStartGridBounds.h,
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
    dragMoveStartGridBounds = { ...selection.gridBounds! }
    selection.dragMoveStartGridX = null
    selection.dragMoveStartGridY = null
  }

  function tilePointInSelection(tx: number, ty: number, tileId: TileId) {
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
        {
          dx: r.x,      // dest tilesheet X
          dy: r.y,      // dest tilesheet Y
          sx: r.bufferX,  // src X inside selection buffer
          sy: r.bufferY,  // src Y inside selection buffer
          sw: r.w,
          sh: r.h,
        },
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

  function selectionGridSpaceMergedRects(): Rect[] {
    if (!selection) throw new Error('no selection')
    const projected: Rect[] = []
    for (const r of selection.currentRects) {
      projected.push(...tileGridManager.projectTileSheetRectToGridRects(r))
    }

    return mergeAdjacentRects(projected)
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

    get currentDraggedRect(): Rect | undefined {
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
    finalizeFloodSelection,
    inFloodMode() {
      return store.currentSubTool === SelectSubTool.FLOOD
    },
    promoteTileSelectionToGridOrigin,
  }
}

function splitMaskForRects(
  floodMask: Uint8Array,
  floodRect: Rect, // GRID-LOCAL
  rects: SelectionTileSheetRect[],
  tileGridManager: TileGridManager,
): Uint8Array[] {
  const masks = rects.map(r => new Uint8Array(r.w * r.h))

  const { x: fx0, y: fy0, w: fw, h: fh } = floodRect

  let logged = false
  for (let iy = 0; iy < fh; iy++) {
    for (let ix = 0; ix < fw; ix++) {
      const maskVal = floodMask[iy * fw + ix]
      if (maskVal === 0) continue

      const gridX = fx0 + ix
      const gridY = fy0 + iy

      // map grid pixel → tilesheet pixel (and tileId)
      const sheetHit = tileGridManager.gridPixelToTileSheetPixel(gridX, gridY)
      if (!sheetHit) continue

      const { tileId, x: sheetX, y: sheetY } = sheetHit

      // find which rect this sheet pixel belongs to
      for (let rIndex = 0; rIndex < rects.length; rIndex++) {
        const r = rects[rIndex]
        if (r.tileId !== tileId) continue
        if (
          sheetX < r.x || sheetY < r.y ||
          sheetX >= r.x + r.w || sheetY >= r.y + r.h
        ) continue

        const localX = sheetX - r.x
        const localY = sheetY - r.y
        const mi = localY * r.w + localX
        masks[rIndex][mi] = maskVal

        if (!logged) {
          logged = true
        }
      }
    }
  }

  return masks
}