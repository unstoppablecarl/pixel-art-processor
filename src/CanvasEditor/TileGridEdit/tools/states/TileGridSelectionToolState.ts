import { makePixelData } from 'pixel-data-js'
import {
  extractPixelData,
  floodFillSelection,
  mergeBinaryMaskRects,
  type NullableBinaryMaskRect,
  type NullableMaskRect,
  subtractBinaryMaskRects,
} from '../../../../../../pixel-data-js/src'
import { type CanvasEditToolStore, useCanvasEditToolStore } from '../../../../lib/store/canvas-edit-tool-store.ts'
import { getRectsBounds, type Rect } from '../../../../lib/util/data/Rect.ts'
import { getImageDataFromClipboard, writePngBlobToClipboard } from '../../../../lib/util/html-dom/clipboard.ts'
import { imageDataToPngBlob } from '../../../../lib/util/html-dom/ImageData.ts'
import type { TileId } from '../../../../lib/wang-tiles/WangTileset.ts'
import { SelectSubTool } from '../../../_core/_core-editor-types.ts'
import { selectMoveBlendModeToBlender32 } from '../../../_core/tools/selection-helpers.ts'
import { CanvasType } from '../../_tile-grid-editor-types.ts'
import type { TileSheetWriter } from '../../data/TileSheetWriter.ts'
import { GridOriginSelection } from '../../lib/GridOriginSelection.ts'
import { type ISelection, type TileOriginTileAlignedRect } from '../../lib/ISelection.ts'
import { TileOriginSelection } from '../../lib/TileOriginSelection.ts'
import type { TileGridRenderer } from '../../renderers/TileGridRenderer.ts'
import type { TileGridEditorState } from '../../TileGridEditorState.ts'

export type TileGridSelectionToolState = ReturnType<typeof makeTileGridSelectionToolState>

export type TileRect = Rect & { tileId: TileId }

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

  function makeGridOriginSelection(selectionRects: NullableMaskRect[]): ISelection {
    const bounds = getRectsBounds(selectionRects)
    const pixels = extractPixelData(gridRenderer.tileGridPixelDataRef.get()!, bounds)

    return new GridOriginSelection(selectionRects, pixels, state.tileGridGeometry)
  }

  function makeSelectionFromInput(): ISelection | null {
    if (!inputSpace) return null
    const selectRect = currentNormalizedRect()
    if (!selectRect) return null

    const rects = [selectRect as NullableMaskRect]
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

  function startMovingSelection() {
    if (!selection) return

    // if content is lifted, commit it first then drop back to a fresh marquee
    if (selection.isLifted) {
      commit()
      rebuildSelection()
    }

    dragging = true
  }

  function startMovingContent() {
    if (!selection || dragging) return

    // promote marquee -> content on first content-drag
    if (!selection.isLifted) {
      selection.lift()
    }

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
    const blendFn = selectMoveBlendModeToBlender32[mode]

    const originalSheetDrawRects = selection.getOriginalSheetDrawRects()
    const currentSheetDrawRects = selection.getCurrentSheetDrawRects()
    const pixels = selection.pixels

    tileSheetWriter.withHistory((mutator) => {
      if (!selection!.isPasted) {
        mutator.clearSheetDrawRects(originalSheetDrawRects)
      }
      mutator.blendSheetDrawRects(currentSheetDrawRects, pixels, blendFn)
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
      const imageData = gridRenderer.tileGridPixelDataRef.get()!

      const result = floodFillSelection(
        imageData,
        x,
        y,
        store.selectFloodContiguous,
        store.selectFloodTolerance,
      )

      if (!result) return
      selection = makeGridOriginSelection([result])
    }

    if (canvasType === CanvasType.TILE) {
      const imageData = state.tileSheet.extractTile(tileId!)
      const result = floodFillSelection(imageData, x, y,
        store.selectFloodContiguous,
        store.selectFloodTolerance,
      )

      if (!result) return

      selection = new TileOriginSelection(
        [result],
        tileId!,
        state.tileGridGeometry,
      )
    }

    selecting = false
    dragging = false
  }

  function addToSelection(newGridRects: NullableBinaryMaskRect[]) {
    const sel = selection
    if (!sel) return

    commit()
    const existing = sel.getCurrentGridRects()
    const all = mergeBinaryMaskRects(existing as NullableBinaryMaskRect[], newGridRects)

    selection = makeGridOriginSelection(all)
  }

  function subtractFromSelection(newGridRects: NullableBinaryMaskRect[]) {
    const sel = selection
    if (!sel) return

    commit()
    const existing = sel.getCurrentGridRects()
    const all = subtractBinaryMaskRects(existing as NullableBinaryMaskRect[], newGridRects)

    selection = makeGridOriginSelection(all)
  }

  function rebuildSelection() {
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

    if (selection.isLifted) {
      // content drag: write pixels to sheet, rebuild at new position
      commit()
      rebuildSelection()
    } else {
      // marquee-only drag: bounds moved but no pixel write — just reanchor
      rebuildSelection()
    }

    drawAffectedTiles()
    dragging = false
  }

  function getSelectionPixels() {
    // If content is already lifted/pasted, pixels are carried on the selection directly.
    // Otherwise extract fresh from the rendered grid at the selection's current bounds.
    if (selection!.pixels) return selection!.pixels

    const gridRects = selection!.getCurrentGridRects()
    const bounds = getRectsBounds(gridRects)
    return extractPixelData(gridRenderer.tileGridPixelDataRef.get()!, bounds)
  }

  async function copySelection() {
    if (!selection) return

    const pixels = getSelectionPixels()
    const gridRects = selection.getCurrentGridRects()

    // If the selection has a single rect with a mask (e.g. from flood fill),
    // pass it through so the exported PNG respects the non-rectangular shape.
    // Multi-rect selections fall back to rectangular export — no single mask applies.
    const maskData = gridRects.length === 1 ? gridRects[0].data ?? undefined : undefined

    await imageDataToPngBlob(pixels.imageData, maskData)
      .then(blob => writePngBlobToClipboard(blob))
  }

  async function cutSelection() {
    if (!selection) return

    if (selection.isLifted) {
      await copySelection()

      tileSheetWriter.withHistory((mutator) => {
        mutator.clearSheetDrawRects(selection!.getOriginalSheetDrawRects())
      })

      clearSelection()
      gridRenderer.updateGridTiles()
      return
    }

    // Marquee/flood selection: respect the mask when clearing.
    // clearSheetDrawRects receives DrawRects which already carry the mask
    // via the `data` and `type` fields projected from the NullableMaskRect —
    // so passing getCurrentSheetDrawRects() is sufficient and mask-aware.
    await copySelection()

    tileSheetWriter.withHistory((mutator) => {
      mutator.clearSheetDrawRects(selection!.getCurrentSheetDrawRects())
    })

    clearSelection()
    gridRenderer.updateGridTiles()
  }

  async function pasteSelection(e: ClipboardEvent) {
    const imageData = await getImageDataFromClipboard(e)

    if (!imageData) return

    clearSelection()

    const gridPixelWidth = state.tileGridManager.canvasWidth.value
    const gridPixelHeight = state.tileGridManager.canvasHeight.value

    const rect: NullableMaskRect = {
      x: Math.floor((gridPixelWidth / 2) - (imageData.width / 2)),
      y: Math.floor((gridPixelHeight / 2) - (imageData.height / 2)),
      w: imageData.width,
      h: imageData.height,
      data: undefined,
      type: undefined,
    }

    const pixels = makePixelData(imageData)

    selection = new GridOriginSelection([rect], pixels, state.tileGridGeometry, true)
    selection.lift()

    inputSpace = CanvasType.GRID
    inputTileId = null
    selecting = false

    drawAffectedTiles()
  }

  return {
    cutSelection,
    copySelection,
    pasteSelection,
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
    dragEnd,

    moveSelectionOnGrid,
    moveSelectionOnTile,

    tilePointInSelection,
    gridPointInSelection,

    finalizeFloodSelection,
    startMovingContent,
    startMovingSelection,
    inFloodMode() {
      return store.currentSubTool === SelectSubTool.FLOOD
    },

    commit,
    clearSelection,
    draw: () => drawAffectedTiles(),
  }
}