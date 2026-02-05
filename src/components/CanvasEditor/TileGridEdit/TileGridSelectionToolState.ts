import { type CanvasEditToolStore, useCanvasEditToolStore } from '../../../lib/store/canvas-edit-tool-store.ts'
import { getRectsBounds, type Rect } from '../../../lib/util/data/Rect.ts'
import { extractImageData, floodFillImageDataSelection } from '../../../lib/util/html-dom/ImageData.ts'
import type { TileId } from '../../../lib/wang-tiles/WangTileset.ts'
import { BlendMode, SelectSubTool } from '../_core-editor-types.ts'
import { CanvasType } from './_tile-grid-editor-types.ts'
import { GridOriginSelection } from './lib/GridOriginSelection.ts'
import type { GridSelectionRect, ISelection } from './lib/ISelection.ts'
import { TileOriginSelection } from './lib/TileOriginSelection.ts'
import type { TileGridRenderer } from './renderers/TileGridRenderer.ts'
import type { TileGridEditorState } from './TileGridEditorState.ts'
import type { TileSheetWriter } from './TileSheetWriter.ts'

export type TileGridSelectionToolState = ReturnType<typeof makeTileGridSelectionToolState>

export function makeTileGridSelectionToolState(
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
  let selection: ISelection | null = null

  let selecting = false
  let dragging = false

  let dragStartX: number | null = null
  let dragStartY: number | null = null
  let dragCurrentX: number | null = null
  let dragCurrentY: number | null = null

  let inputSpace: CanvasType | null = null
  let inputTileId: TileId | null = null

  function currentNormalizedRect(): Rect | null {
    if (dragStartX == null || dragStartY == null) return null
    if (dragCurrentX == null || dragCurrentY == null) return null

    const x1 = Math.min(dragStartX, dragCurrentX)
    const y1 = Math.min(dragStartY, dragCurrentY)
    const x2 = Math.max(dragStartX, dragCurrentX)
    const y2 = Math.max(dragStartY, dragCurrentY)

    const result = {
      x: x1,
      y: y1,
      w: x2 - x1,
      h: y2 - y1,
    }

    if (result.w <= 0 || result.h <= 0) return null
    return result
  }

  function clearRenderedSelection(sel: ISelection) {
    const tileIds = sel.getOverlappingTileIds()
    gridRenderer.queueRenderTiles(tileIds)
    gridRenderer.queueRenderGrid()
  }

  function makeGridOriginSelectionFromBounds(bounds: Rect, mask: Uint8Array | null = null): ISelection {
    const gridRect: GridSelectionRect = {
      x: bounds.x,
      y: bounds.y,
      w: bounds.w,
      h: bounds.h,
      mask,
    }

    const tileAligned = state.tileGridGeometry.gridRectsToTileAlignedRects([gridRect])
    const sheetRects = tileAligned.map(r => state.tileGridGeometry.tileAlignedRectToSheetRect(r))
    const tileSheetBounds = getRectsBounds(sheetRects)

    const pixels = extractImageData(
      gridRenderer.tileGridImageDataRef.get()!,
      bounds,
    )

    return new GridOriginSelection(
      [gridRect],
      state.tileGridGeometry,
      pixels,
      tileSheetBounds,
    )
  }

  function makeTileOriginSelectionFromTileRect(tileId: TileId, localRect: Rect): ISelection {

    const { sheetRect, tileAligned } = state.tileSheet.tileLocalRectToTileSheetRect(tileId, localRect)

    const pixels = state.tileSheet.extractImageData(sheetRect)

    return new TileOriginSelection(
      [tileAligned],
      state.tileGridGeometry,
      pixels,
      sheetRect,
    )
  }

  function makeSelectionFromInput(): ISelection | null {
    if (!inputSpace) return null
    const selectRect = currentNormalizedRect()
    if (!selectRect) return null

    if (inputSpace === CanvasType.TILE) {
      return makeTileOriginSelectionFromTileRect(inputTileId!, selectRect)
    }

    if (inputSpace === CanvasType.GRID) {
      return makeGridOriginSelectionFromBounds(selectRect)
    }

    throw new Error('invalid inputSpace: ' + inputSpace)
  }

  function startSelection(x: number, y: number, canvasType: CanvasType, tileId: TileId | null = null) {
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
    selection = makeSelectionFromInput()
    selecting = false
    for (const r of selection!.getCurrentTileAlignedRects()) {
      const sheetRect = state.tileGridGeometry.tileAlignedRectToSheetRect(r)
      console.log(JSON.stringify({
        LOG_NAME: 'ASSERT TILE→SHEET',
        tileId: r.tileId,
        tileIndex: state.tileset.byId.get(r.tileId)!.index,
        selectionX: r.selectionX,
        selectionY: r.selectionY,
        w: r.w,
        h: r.h,
        sheetRect,
      }))
    }
  }

  function gridDragStart(gx: number, gy: number) {
    if (!selection) return
    dragging = true
    selection.startGridDrag(gx, gy)
  }

  function tileDragStart(tx: number, ty: number, tileId: TileId) {
    if (!selection) return
    dragging = true
    selection.startTileDrag(tx, ty, tileId)
  }

  function moveSelectionOnGrid(x: number, y: number) {
    if (!selection) return
    if (state.mouseLastX === null || state.mouseLastY === null) return
    const dx = x - state.mouseLastX
    const dy = y - state.mouseLastY
    if (dx === 0 && dy === 0) return
    selection.moveOnGrid(dx, dy)
  }

  function moveSelectionOnTile(x: number, y: number, tileId: TileId) {
    if (!selection) return
    if (state.mouseLastX === null || state.mouseLastY === null) return
    const dx = x - state.mouseLastX
    const dy = y - state.mouseLastY
    if (dx === 0 && dy === 0) return
    selection.moveOnTile(dx, dy, tileId)
  }

  function tilePointInSelection(tx: number, ty: number, tileId: TileId) {
    if (!selection) return false
    return selection.getCurrentTileAlignedRects().some(r =>
      r.tileId === tileId &&
      tx >= r.selectionX && tx < r.selectionX + r.w &&
      ty >= r.selectionY && ty < r.selectionY + r.h,
    )
  }

  function gridPointInSelection(gx: number, gy: number) {
    if (!selection) return false
    return selection.getCurrentGridFootprint().some(r =>
      gx >= r.x && gx < r.x + r.w &&
      gy >= r.y && gy < r.y + r.h,
    )
  }

  function commit(mode: BlendMode) {
    if (!selection) return

    const originalSheetDrawRects = selection.getOriginalDrawRectsForSheet()
    const currentSheetDrawRects = selection.getCurrentDrawRectsForSheet()
    const pixels = selection.pixels

    for (const r of originalSheetDrawRects) {
      tileSheetWriter.clearRect(r.dx, r.dy, r.w, r.h)
    }

    for (const r of currentSheetDrawRects) {
      tileSheetWriter.blendSheetImageData(
        pixels,
        mode,
        {
          dx: r.dx,
          dy: r.dy,
          sx: r.sx,
          sy: r.sy,
          sw: r.w,
          sh: r.h,
          mask: r.mask ?? undefined,
        },
      )
    }

    const movedTileIds = selection.getOverlappingTileIds()
    gridRenderer.queueRenderTiles(movedTileIds)
    gridRenderer.queueRenderGrid()

    selection = null
    dragging = false
  }

  function clearSelection() {
    if (!selection) return
    clearRenderedSelection(selection)
    selection = null
  }

  function draw() {
    const tileIds = selection?.getOverlappingTileIds() ?? []
    gridRenderer.queueRenderTiles(tileIds)
    gridRenderer.queueRenderGrid()
  }

  function finalizeFloodSelection(
    x: number,
    y: number,
    canvasType: CanvasType,
    tileId: TileId | null = null,
  ) {
    const isTile = tileId !== null
    inputSpace = canvasType
    inputTileId = tileId

    const imageData = isTile
      ? state.tileSheet.imageData
      : gridRenderer.tileGridImageDataRef.get()!

    const result = floodFillImageDataSelection(
      imageData,
      x,
      y,
      store.selectFloodContiguous,
      store.selectFloodTolerance,
    )

    if (!result) return

    const { rect, mask } = result

    if (isTile) {
      const { sheetRect, tileAligned } = state.tileSheet.tileLocalRectToTileSheetRect(tileId, rect)

      const pixels = state.tileSheet.extractImageData(sheetRect)

      selection = new TileOriginSelection(
        [tileAligned],
        state.tileGridGeometry,
        pixels,
        sheetRect,
      )
    } else {
      selection = makeGridOriginSelectionFromBounds(rect, mask)
    }

    selecting = false
    dragging = false
  }

  return {
    get inputTileId() {
      return inputTileId
    },

    get isTileSelection() {
      return inputSpace === CanvasType.TILE
    },

    get currentDraggedRect(): Rect | null {
      return currentNormalizedRect()
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
      return selection?.hasMoved() ?? false
    },

    tileStartSelection,
    gridStartSelection,
    updateSelection,
    finalizeSelection,

    gridDragStart,
    tileDragStart,
    dragEnd() {
      dragging = false
    },

    moveSelectionOnGrid,
    moveSelectionOnTile,

    tilePointInSelection,
    gridPointInSelection,

    finalizeFloodSelection,

    inFloodMode() {
      return store.currentSubTool === SelectSubTool.FLOOD
    },

    commit,
    clearSelection,
    draw,
  }
}