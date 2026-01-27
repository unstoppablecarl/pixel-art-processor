import type { RectBounds } from '../../lib/util/data/Bounds.ts'
import { getRectsBounds } from '../../lib/util/data/Rect.ts'
import type { TileId } from '../../lib/wang-tiles/WangTileset.ts'
import { BlendMode, CanvasType } from './_canvas-editor-types.ts'
import type { TileGridManager } from './data/TileGridManager.ts'
import type { EditorState } from './EditorState.ts'
import {
  makeTileSheetSelection,
  mergeRectBounds,
  type TileSheetRect,
  type TileSheetSelection,
} from './lib/TileSheetSelection.ts'
import type { TileGridRenderer } from './TileGridRenderer.ts'
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
    const tileIds = new Set<TileId>()
    for (const r of sel.currentRects) {
      tileIds.add(r.tileId)
    }
    console.log({
      LOG_NAME: 'clearRenderedSelection',
      tileIds: [...tileIds],
    })
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

    console.log({
      LOG_NAME: 'finalizeSelection.before',
      dragStartX,
      dragStartY,
      dragCurrentX,
      dragCurrentY,
      inputSpace,
    })

    selection = makeSelectionFromInput()

    console.log({
      LOG_NAME: 'finalizeSelection.after',
      selection,
    })

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
      selection,
    })

    if (selection.gridBounds) {
      selection.dragMoveStartGridX = x - selection.gridBounds.x
      selection.dragMoveStartGridY = y - selection.gridBounds.y
    } else {
      selection.dragMoveStartGridX = null
      selection.dragMoveStartGridY = null
    }
  }

  function moveSelectionOnGrid(x: number, y: number) {
    if (!selection || !dragging) return

    const igb = selection.initialGridBounds!
    // 1. Compute new top-left based on mouse offset
    const newX = x - selection.dragMoveStartGridX!
    const newY = y - selection.dragMoveStartGridY!

    // 2. Compute delta relative to initial bounds
    const dxGrid = newX - igb.x
    const dyGrid = newY - igb.y

    // 3. Update gridBounds
    selection.gridBounds = {
      x: igb.x + dxGrid,
      y: igb.y + dyGrid,
      w: igb.w,
      h: igb.h,
    }

    selection.offsetX = dxGrid
    selection.offsetY = dyGrid

    gridRenderer.queueRenderAll()
  }

  function tileInSelection(tileId: TileId, tx: number, ty: number) {
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

  function gridInSelection(gx: number, gy: number) {
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

    console.log('=== COMMIT START ===')
    console.log({
      LOG_NAME: 'selection',
      originalRects: selection.originalRects,
      currentRects: selection.currentRects,
      tileSheetBounds: selection.tileSheetBounds,
      initialGridBounds: selection.initialGridBounds,
      gridBounds: selection.gridBounds,
      hasMoved: selection.hasMoved,
    })

    const pixels = selection.toPixels(state.tileSheet)
    console.log({
      LOG_NAME: 'pixels size',
      w: pixels.width,
      h: pixels.height,
    })

    const gb = selection.gridBounds
    const igb = selection.initialGridBounds

    // TILE-ONLY PATH (no grid movement)
    if (!gb || !igb) {
      console.log({ LOG_NAME: 'commit path', path: 'TILE' })
      for (const r of selection.currentRects) {
        console.log({ LOG_NAME: 'TILE write rect', ...r })
        tileSheetWriter.blendTileSheetRect(r, pixels, mode)
      }
      const tileIds = [...new Set(selection.currentRects.map(r => r.tileId))]
      console.log({ LOG_NAME: 'TILE movedTileIds', tileIds })
      gridRenderer.queueRenderTiles(tileIds)
      gridRenderer.queueRenderGrid()
      selection = null
      dragging = false
      console.log('=== COMMIT END (TILE) ===')
      return
    }

    // GRID MOVEMENT PATH
    const rawDx = gb.x - igb.x
    const rawDy = gb.y - igb.y

    const tileSize = state.tileSize
    const gridDx = Math.round(rawDx / tileSize) * tileSize
    const gridDy = Math.round(rawDy / tileSize) * tileSize

    console.log({
      LOG_NAME: 'grid movement',
      rawDx,
      rawDy,
      tileSize,
      gridDx,
      gridDy,
    })

    const movedTileIds = new Set<TileId>()

    console.log('clearing original rects:')
    for (const r of selection.originalRects) {
      console.log({ LOG_NAME: 'clear rect', ...r })
      state.tileSheet.clearTileSheetRect(r)
    }

    console.log('writing moved rects:')
    for (const orig of selection.originalRects) {
      // project ORIGINAL rect into grid space
      const projected = tileGridManager.projectTileSheetRectToGridRects(orig)
      const baseGridRect = projected[0]

      const origGX = baseGridRect.x
      const origGY = baseGridRect.y

      const newGX = origGX + gridDx
      const newGY = origGY + gridDy

      const hit = tileGridManager.gridPixelToTile(newGX, newGY)

      let sheetPos = { x: NaN, y: NaN }
      if (hit) {
        sheetPos = state.tileSheet.tileLocalToSheet(
          hit.tile.id,
          orig.tileX,
          orig.tileY,
        )
      }

      console.log({
        LOG_NAME: 'COMMIT_TRACE',
        initialGridBounds: selection.initialGridBounds,
        gridBounds: selection.gridBounds,
        rawDx,
        rawDy,
        gridDx,
        gridDy,
        srcRect: orig,
        projected,
        origGX,
        origGY,
        newGX,
        newGY,
        hit,
        tileId: hit?.tile.id ?? null,
        tileX: orig.tileX,
        tileY: orig.tileY,
        sheetPos,
      })

      if (!hit) continue

      const newTile = hit.tile

      const writeRect: TileSheetRect = {
        x: sheetPos.x,
        y: sheetPos.y,
        w: orig.w,
        h: orig.h,
        tileId: newTile.id,
        srcX: orig.srcX,
        srcY: orig.srcY,
        gridX: newGX,
        gridY: newGY,
        tileX: orig.tileX,
        tileY: orig.tileY,
      }

      console.log({
        LOG_NAME: 'WRITE rect',
        ...writeRect,
      })

      tileSheetWriter.blendTileSheetRect(writeRect, pixels, mode)
      movedTileIds.add(newTile.id)
    }

    const movedIdsArr = [...movedTileIds]
    console.log({
      LOG_NAME: 'movedTileIds',
      movedIdsArr,
    })

    gridRenderer.queueRenderTiles(movedIdsArr)
    gridRenderer.queueRenderGrid()

    selection = null
    dragging = false

    console.log('=== COMMIT END (GRID) ===')
  }

  function selectionGridSpaceMergedRects(): RectBounds[] {
    if (!selection) throw new Error('no selection')
    const projected: RectBounds[] = []
    for (const r of selection.currentRects) {
      projected.push(...tileGridManager.projectTileSheetRectToGridRects(r))
    }

    const merged = mergeRectBounds(projected)
    return merged
  }

  function clearSelection() {
    console.log({
      LOG_NAME: 'clearSelection',
      selection,
    })
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
    moveSelectionOnGrid,
    moveSelection: (x: number, y: number) => {
      console.log({
        LOG_NAME: 'moveSelection (TILE canvas, unused for now)',
        x,
        y,
      })
    },
    tileInSelection,
    gridInSelection,
    selectionGridSpaceMergedRects,
    commit,
    clearSelection,
  }
}
