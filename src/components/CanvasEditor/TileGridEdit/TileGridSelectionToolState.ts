import { type CanvasEditToolStore, useCanvasEditToolStore } from '../../../lib/store/canvas-edit-tool-store.ts'
import { getRectsBounds, type Rect } from '../../../lib/util/data/Rect.ts'
import { extractImageData, floodFillImageDataSelection } from '../../../lib/util/html-dom/ImageData.ts'
import type { TileId } from '../../../lib/wang-tiles/WangTileset.ts'
import { SelectSubTool } from '../_core-editor-types.ts'
import { CanvasType } from './_tile-grid-editor-types.ts'
import type { TileRect } from './data/TileSheetHistory.ts'
import type { TileSheetWriter } from './data/TileSheetWriter.ts'
import { GridOriginSelection } from './lib/GridOriginSelection.ts'
import {
  type ISelection,
  mergeSelectionRects,
  type SelectionRect,
  subtractSelectionRects,
  type TileOriginTileAlignedRect,
} from './lib/ISelection.ts'
import { TileOriginSelection } from './lib/TileOriginSelection.ts'
import type { TileGridRenderer } from './renderers/TileGridRenderer.ts'
import type { TileGridEditorState } from './TileGridEditorState.ts'

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

  function makeGridOriginSelection(selectionRects: SelectionRect[]): ISelection {
    const bounds = getRectsBounds(selectionRects)
    const pixels = extractImageData(gridRenderer.tileGridImageDataRef.get()!, bounds)

    return new GridOriginSelection(selectionRects, pixels, state.tileGridGeometry)
  }

  function makeSelectionFromInput(): ISelection | null {
    if (!inputSpace) return null
    const selectRect = currentNormalizedRect()
    if (!selectRect) return null

    const rects = [selectRect as SelectionRect]
    if (inputSpace === CanvasType.TILE) {
      return new TileOriginSelection(
        rects,
        inputTileId!,
        state.tileGridGeometry,
      )
    }

    if (inputSpace === CanvasType.GRID) {
      return makeGridOriginSelection(rects)
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
    drawAffectedTiles()
  }

  function moveSelectionOnTile(x: number, y: number, tileId: TileId) {
    if (!selection) return
    if (state.mouseLastX === null || state.mouseLastY === null) return
    const dx = x - state.mouseLastX
    const dy = y - state.mouseLastY
    if (dx === 0 && dy === 0) return
    selection.moveOnTile(dx, dy, tileId)
    drawAffectedTiles()
  }

  function tilePointInSelection(tx: number, ty: number, tileId: TileId) {
    if (!selection) return false
    if (inputSpace !== CanvasType.TILE) throw new Error('invalid canvas type: ' + inputSpace)

    const rects = selection.getCurrentTileAlignedRects() as TileOriginTileAlignedRect[]
    return rects.some(r =>
      r.tileId === tileId &&
      tx >= r.tileSelectionX && tx < r.tileSelectionX + r.w &&
      ty >= r.tileSelectionY && ty < r.tileSelectionY + r.h,
    )
  }

  function gridPointInSelection(gx: number, gy: number) {
    if (!selection) return false
    const rects = selection.getCurrentGridDrawRects()
    return rects.some(r =>
      gx >= r.dx && gx < r.dx + r.w &&
      gy >= r.dy && gy < r.dy + r.h,
    )
  }

  function commit() {
    if (!selection) return

    const mode = store.selectMoveBlendMode
    const originalSheetDrawRects = selection.getOriginalSheetDrawRects()
    const currentSheetDrawRects = selection.getCurrentSheetDrawRects()
    const pixels = selection.pixels

    tileSheetWriter.withHistory((mutator) => {
      for (const r of originalSheetDrawRects) {
        mutator.clear(r.dx, r.dy, r.w, r.h, r.mask)
      }

      for (const r of currentSheetDrawRects) {
        mutator.blendImageData(
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
    })
    gridRenderer.updateGridTiles()
    dragging = false
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
    inputSpace = canvasType
    inputTileId = tileId

    if (canvasType === CanvasType.GRID) {
      const imageData = gridRenderer.tileGridImageDataRef.get()!
      const result = floodFillImageDataSelection(
        imageData,
        x,
        y,
        store.selectFloodContiguous,
        store.selectFloodTolerance,
      )

      if (!result) return
      selection = makeGridOriginSelection([result.selectionRect])
    }

    if (canvasType === CanvasType.TILE) {
      const imageData = state.tileSheet.extractTile(tileId!)
      const result = floodFillImageDataSelection(
        imageData,
        x,
        y,
        store.selectFloodContiguous,
        store.selectFloodTolerance,
      )
      if (!result) return

      selection = new TileOriginSelection(
        [result.selectionRect],
        tileId!,
        state.tileGridGeometry,
      )
    }

    selecting = false
    dragging = false
  }

  function addToSelection(newGridRects: SelectionRect[]) {
    const sel = selection
    if (!sel) return

    commit()
    const existing = sel.getCurrentGridRects()
    const all = mergeSelectionRects(existing, newGridRects)

    selection = makeGridOriginSelection(all)
  }

  function subtractFromSelection(newGridRects: SelectionRect[]) {
    const sel = selection
    if (!sel) return

    commit()
    const existing = sel.getCurrentGridRects()
    const all = subtractSelectionRects(existing, newGridRects)

    selection = makeGridOriginSelection(all)
  }

  function rebuildSelectionAfterCommit() {
    if (!selection) return

    if (inputSpace === CanvasType.GRID) {
      const rects = selection.getCurrentGridRects()
      if (rects.length === 0) return
      selection = makeGridOriginSelection(rects)
      return
    }

    if (inputSpace === CanvasType.TILE && inputTileId != null) {
      const tileRects = selection.getCurrentTileRects(inputTileId)
      if (tileRects.length === 0) return
      selection = new TileOriginSelection(
        tileRects,
        inputTileId,
        state.tileGridGeometry,
      )
    }
  }

  function dragEnd() {
    if (!selection) {
      dragging = false
      return
    }

    if (!selection.hasMoved()) {
      dragging = false
      return
    }

    commit()
    rebuildSelectionAfterCommit()
    drawAffectedTiles()
    dragging = false
  }

  return {
    get inputTileId() {
      return inputTileId
    },

    get isTileSelection() {
      return inputSpace === CanvasType.TILE
    },

    get currentDraggedRectsGrid(): Rect[] | null {
      const rect = currentNormalizedRect()
      if (!rect) return null
      const selectionRect = { ...rect, mask: null }

      if (inputTileId) {
        return state.tileGridGeometry.tileRectsToDuplicatedGridRects(inputTileId, [selectionRect], 0, 0)
      } else {
        return state.tileGridGeometry.gridRectsToDuplicatedGridRects([selectionRect], 0, 0)
      }
    },

    get currentDraggedRectTile(): TileRect | null {
      const r = currentNormalizedRect()
      if (!r) return null

      if (inputTileId) {
        return { ...r, tileId: inputTileId }
      }

      const t = state.tileGridGeometry.gridPixelToTilePixel(r.x, r.y)
      if (!t) return null
      const { tileId, tx, ty } = t
      return {
        tileId,
        x: tx,
        y: ty,
        w: r.w,
        h: r.h,
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
      return selection?.hasMoved() ?? false
    },

    tileStartSelection,
    gridStartSelection,
    updateSelection,
    finalizeSelection,
    addToSelection,
    subtractFromSelection,
    gridDragStart,
    tileDragStart,
    dragEnd,

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