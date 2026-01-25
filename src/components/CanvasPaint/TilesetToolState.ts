import type { RectBounds } from '../../lib/util/data/Bounds.ts'
import { extractImageData } from '../../lib/util/html-dom/ImageData.ts'
import type { TileId } from '../../lib/wang-tiles/WangTileset.ts'
import { BlendMode, type Selection } from './_canvas-editor-types.ts'
import type { TileGridRenderer } from './TileGridRenderer.ts'
import type { TileSheetWriter } from './TileSheetWriter.ts'

export type TilesetToolState = ReturnType<typeof makeTilesetToolState>

export function makeTilesetToolState(
  {
    tileSheetWriter,
    gridRenderer,
  }:
  {
    tileSheetWriter: TileSheetWriter,
    gridRenderer: TileGridRenderer,
  },
) {
  let selection: Selection | null = null

  let selecting = false
  let dragging = false

  function startSelection(x: number, y: number) {
    selection = {
      x,
      y,
      w: 0,
      h: 0,

      origX: x,
      origY: y,
      origW: 0,
      origH: 0,

      pixels: null,
      offsetX: 0,
      offsetY: 0,
    }

    selecting = true
    dragging = false
  }

  function selectionHasMoved() {
    const sel = selection
    if (!sel) return false
    return sel.x !== sel.origX || sel.y !== sel.origY
  }

  function originalRect(): RectBounds {
    const sel = selection
    if (!sel) throw new Error('no selection')
    return {
      x: sel.origX,
      y: sel.origY,
      w: sel.origW,
      h: sel.origH,
    }
  }

  function dragStart(x: number, y: number) {
    if (!selection) throw new Error('no Selection')
    dragging = true
    selection.offsetX = x - selection.x
    selection.offsetY = y - selection.y
  }

  function updateSelection(x: number, y: number) {
    if (!selection) return
    selection.w = x - selection.x
    selection.h = y - selection.y
  }

  function moveSelection(x: number, y: number) {
    if (!selection) return
    selection.x = x - selection.offsetX
    selection.y = y - selection.offsetY
  }

  function normalizeSelection(sel: Selection) {
    if (sel.w < 0) {
      sel.x += sel.w
      sel.w = -sel.w
    }
    if (sel.h < 0) {
      sel.y += sel.h
      sel.h = -sel.h
    }
  }

  function extractSelectionPixels(imageData: ImageData) {
    if (!selection) return
    const sel = selection

    normalizeSelection(sel)

    sel.origX = sel.x
    sel.origY = sel.y
    sel.origW = sel.w
    sel.origH = sel.h

    if (sel.w && sel.h) {
      sel.pixels = extractImageData(imageData, sel.x, sel.y, sel.w, sel.h)
    }
  }

  function clearSelection() {
    selection = null
    selecting = false
    dragging = false
  }

  function inSelection(x: number, y: number) {
    if (!selection) return false
    const sel = selection
    return (
      x >= sel.x &&
      x < sel.x + sel.w &&
      y >= sel.y &&
      y < sel.y + sel.h
    )
  }

  function commitGrid(mode: BlendMode) {
    const sel = selection
    if (!sel?.pixels) return
    if (sel.w && sel.h) {
      tileSheetWriter.clearGridRect(sel.origX, sel.origY, sel.origW, sel.origH)
      const affectedTileIds = tileSheetWriter.blendGridImageData(sel.pixels, sel.x, sel.y, mode)
      gridRenderer.queueRenderTiles(affectedTileIds)
    }
    clearSelection()
    gridRenderer.queueRenderGrid()
  }

  function commitTile(tileId: TileId, mode: BlendMode) {
    const sel = selection
    if (!sel?.pixels) return
    if (sel.w && sel.h) {
      tileSheetWriter.clearTileRect(tileId, sel.origX, sel.origY, sel.origW, sel.origH)
      tileSheetWriter.blendTileImageData(tileId, sel.pixels, sel.x, sel.y, mode)
      gridRenderer.queueRenderTile(tileId)
    }
    clearSelection()
    gridRenderer.queueRenderTile(tileId)
  }

  return {
    get selection() {
      return selection
    },

    get selecting() {
      return selecting
    },
    set selecting(val) {
      selecting = val
    },

    get dragging() {
      return dragging
    },
    set dragging(val) {
      dragging = val
    },
    commitGrid,
    commitTile,
    dragStart,
    originalRect,
    selectionHasMoved,
    inSelection,
    startSelection,
    updateSelection,
    moveSelection,
    extractSelectionPixels,
    clearSelection,
  }
}
