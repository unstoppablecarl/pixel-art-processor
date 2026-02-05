import { type CanvasEditToolStore, useCanvasEditToolStore } from '../../../lib/store/canvas-edit-tool-store.ts'
import { getRectsBounds, type Rect } from '../../../lib/util/data/Rect.ts'
import { extractImageData, floodFillImageDataSelection } from '../../../lib/util/html-dom/ImageData.ts'
import type { TileId } from '../../../lib/wang-tiles/WangTileset.ts'
import { BlendMode, SelectSubTool } from '../_core-editor-types.ts'
import { CanvasType } from './_tile-grid-editor-types.ts'
import { GridOriginSelection } from './lib/GridOriginSelection.ts'
import type { ISelection, SelectionRect } from './lib/ISelection.ts'
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

  function makeGridOriginSelectionFromBounds(bounds: Rect, mask: Uint8Array | null = null): ISelection {
    const selectionRect: SelectionRect = {
      x: bounds.x,
      y: bounds.y,
      w: bounds.w,
      h: bounds.h,
      mask,
    }
    const pixels = extractImageData(gridRenderer.tileGridImageDataRef.get()!, bounds)

    return new GridOriginSelection([selectionRect], pixels, state.tileGridGeometry)
  }

  function makeTileOriginSelectionFromTileRect(
    tileId: TileId,
    bounds: Rect,
    mask: Uint8Array | null = null,
  ): ISelection {
    const selectionRect: SelectionRect = {
      x: bounds.x,
      y: bounds.y,
      w: bounds.w,
      h: bounds.h,
      mask,
    }

    const originX = bounds.x
    const originY = bounds.y

    const tileAlignedRects = state.tileGridGeometry.tileRectsToTileAlignedRects(
      tileId,
      [selectionRect],
      originX,
      originY,
    )

    const sheetBounds = getRectsBounds(
      tileAlignedRects.map(r => ({
        x: r.sx,
        y: r.sy,
        w: r.w,
        h: r.h,
      })),
    )

    const pixels = state.tileSheet.extractImageData(sheetBounds)

    const clippedSelectionRects: SelectionRect[] = tileAlignedRects.map(r => ({
      x: r.selectionX,
      y: r.selectionY,
      w: r.w,
      h: r.h,
      mask: r.mask,
    }))

    return new TileOriginSelection(
      clippedSelectionRects,
      pixels,
      tileId,
      state.tileGridGeometry,
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
    if (selection) drawAffectedTiles()
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
  }

  function gridDragStart(gx: number, gy: number) {
    if (!selection) return
    dragging = true
  }

  function tileDragStart(tx: number, ty: number, tileId: TileId) {
    if (!selection) return
    dragging = true
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
    return selection.getCurrentGridRects().some(r =>
      gx >= r.x && gx < r.x + r.w &&
      gy >= r.y && gy < r.y + r.h,
    )
  }

  function commit(mode: BlendMode) {
    if (!selection) return

    const originalSheetDrawRects = selection.getOriginalSheetDrawRects()
    const currentSheetDrawRects = selection.getCurrentSheetDrawRects()
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

    dragging = false
    clearSelection()
  }

  function clearSelection() {
    if (!selection) return
    const prev = selection
    selection = null
    dragCurrentX = null
    dragCurrentY = null
    dragStartX = null
    dragStartY = null
    drawAffectedTiles(prev)
  }

  function drawAffectedTiles(target: ISelection | null = selection!) {
    if (target) {
      const tileIds = target.getOverlappingTileIds() ?? []
      gridRenderer.queueRenderTiles(tileIds)
      gridRenderer.queueRenderGrid()
    } else {
      gridRenderer.queueRenderAll()
    }
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
      const originX = rect.x
      const originY = rect.y

      const tileAlignedRects = state.tileGridGeometry.tileRectsToTileAlignedRects(
        tileId!,
        [{ ...rect, mask }],
        originX,
        originY,
      )

      const sheetBounds = getRectsBounds(
        tileAlignedRects.map(r => ({
          x: r.sx,
          y: r.sy,
          w: r.w,
          h: r.h,
        })),
      )

      const pixels = state.tileSheet.extractImageData(sheetBounds)

      const clippedSelectionRects: SelectionRect[] = tileAlignedRects.map(r => ({
        x: r.selectionX,
        y: r.selectionY,
        w: r.w,
        h: r.h,
        mask: r.mask,
      }))

      selection = new TileOriginSelection(
        clippedSelectionRects,
        pixels,
        tileId!,
        state.tileGridGeometry,
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
    draw: () => drawAffectedTiles(),
  }
}