import type { TileId } from '../../lib/wang-tiles/WangTileset.ts'
import { BlendMode, CanvasType } from './_canvas-editor-types.ts'
import type { TileGridManager } from './data/TileGridManager.ts'
import { makeTileSheetSelection, type TileSheetRect, type TileSheetSelection } from './lib/TileSheetSelection.ts'
import type { TileGridRenderer } from './TileGridRenderer.ts'
import type { TileSheetWriter } from './TileSheetWriter.ts'

export type TilesetToolState = ReturnType<typeof makeTilesetToolState>

export function makeTilesetToolState(
  {
    tileSheetWriter,
    gridRenderer,
    tileGridManager,
  }: {
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

    // ⭐ FIX: bounds must be selection-local in GRID mode
    const bounds =
      inputSpace === CanvasType.GRID
        ? { x: 0, y: 0, w, h }
        : { x: x1, y: y1, w, h }

    let tileSheetRects: TileSheetRect[] = []

    if (inputSpace === CanvasType.TILE) {
      tileSheetRects =
        tileGridManager.tileSheet.value.tileLocalRectToTileSheetRect(
          inputTileId!,
          { x: x1, y: y1, w, h },
          bounds,
        )
    }

    if (inputSpace === CanvasType.GRID) {
      tileSheetRects = tileGridManager.gridRectToTileSheetRects(
        { x: x1, y: y1, w, h },
        bounds,
      )
    }

    if (tileSheetRects.length === 0) return null

    return makeTileSheetSelection(tileSheetRects, bounds)
  }

  function startSelection(tx: number, ty: number, canvasType: CanvasType, tileId: TileId | null = null) {
    console.log('START SELECTION', { x: tx, y: ty })
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
    console.log('[TilesetToolState] finalizeSelection before', {
      selecting,
      dragStartX,
      dragStartY,
      dragCurrentX,
      dragCurrentY,
    })

    if (!selecting) return
    if (dragStartX == null || dragStartY == null) return
    if (dragCurrentX == null || dragCurrentY == null) return

    selection = makeSelectionFromInput()
    console.log('[TilesetToolState] finalizeSelection after', {
      selection: !!selection,
      rects: selection?.currentRects,
    })

    selecting = false
    dragging = false

    dragStartX = null
    dragStartY = null
    dragCurrentX = null
    dragCurrentY = null
    inputTileId = null
  }

  function dragStart(x: number, y: number) {
    console.log('[TilesetToolState] dragStart', { x, y, hasSelection: !!selection })
    if (!selection) return
    dragging = true
    dragStartX = x
    dragStartY = y
  }

  function moveSelection(gx: number, gy: number) {
    console.log('[TilesetToolState] moveSelection', {
      gx,
      gy,
      dragging,
      hasSelection: !!selection,
      dragStartX,
      dragStartY,
    })
    if (!selection || !dragging) return
    if (dragStartX == null || dragStartY == null) return
    const dx = gx - dragStartX
    const dy = gy - dragStartY
    selection.move(dx, dy)
  }

  function tileInSelection(tileId: TileId, tx: number, ty: number) {
    if (!selection) return false
    return tileGridManager.tileSheet.value.tilePointInTileSheetSelection(tileId, tx, ty, selection)
  }

  function gridInSelection(gx: number, gy: number) {
    if (!selection) return false
    return tileGridManager.gridPointInTileSheetSelection(gx, gy, selection)
  }

  function commit(mode: BlendMode) {
    if (!selection) return

    // Clear original pixels
    for (const r of selection.originalRects) {
      tileGridManager.tileSheet.value.clearTileSheetRect(r)
    }

    // Write moved pixels
    const pixels = selection.toPixels(tileGridManager.tileSheet.value)
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

  return {
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

    commit,
  }
}
