import { type CanvasEditToolStore, useCanvasEditToolStore } from '../../../lib/store/canvas-edit-tool-store.ts'
import { type Rect, trimRectBounds } from '../../../lib/util/data/Rect.ts'
import { imageDataToPngBlob } from '../../../lib/util/html-dom/blit.ts'
import { getImageDataFromClipboard, writePngBlobToClipboard } from '../../../lib/util/html-dom/clipboard.ts'
import { extractImageData, floodFillImageDataSelection } from '../../../lib/util/html-dom/ImageData.ts'
import { SelectSubTool } from '../_core/_core-editor-types.ts'
import { selectMoveBlendModeToBlendFn } from '../_core/tools/selection-helpers.ts'
import type { CanvasPaintEditorState } from './CanvasPaintEditorState.ts'
import type { CanvasRenderer } from './CanvasRenderer.ts'
import type { CanvasPaintWriter } from './data/CanvasPaintWriter.ts'
import { type CanvasPaintSelection, makeCanvasPaintSelection } from './lib/CanvasPaintSelection.ts'

export type CanvasPaintSelectToolState = ReturnType<typeof makeCanvasPaintSelectToolState>

export function makeCanvasPaintSelectToolState(
  {
    state,
    canvasRenderer,
    canvasWriter,
    store = useCanvasEditToolStore(),
  }: {
    state: CanvasPaintEditorState,
    canvasRenderer: CanvasRenderer,
    canvasWriter: CanvasPaintWriter,
    store?: CanvasEditToolStore,
  },
) {

  let selection: CanvasPaintSelection | null = null
  let dragging = false
  let selecting = false

  let dragStartNewSelectionX: number | null = null
  let dragStartNewSelectionY: number | null = null
  let dragCurrentNewSelectionX: number | null = null
  let dragCurrentNewSelectionY: number | null = null

  function selectionRect(): Rect | null {
    if (
      dragStartNewSelectionX == null || dragStartNewSelectionY == null ||
      dragCurrentNewSelectionX == null || dragCurrentNewSelectionY == null
    ) return null

    const x1 = Math.min(dragStartNewSelectionX, dragCurrentNewSelectionX)
    const y1 = Math.min(dragStartNewSelectionY, dragCurrentNewSelectionY)
    const x2 = Math.max(dragStartNewSelectionX, dragCurrentNewSelectionX)
    const y2 = Math.max(dragStartNewSelectionY, dragCurrentNewSelectionY)

    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }
  }

  function getPixels(r: Rect) {
    const img = state.imageDataRef.get()!
    trimRectBounds(r, { x: 0, y: 0, w: img.width, h: img.height })
    return extractImageData(img, r.x, r.y, r.w, r.h)
  }

  function startRectSelection(x: number, y: number) {
    selecting = true
    dragging = false
    dragStartNewSelectionX = x
    dragStartNewSelectionY = y
    dragCurrentNewSelectionX = x
    dragCurrentNewSelectionY = y
  }

  function resizeRectSelection(x: number, y: number) {
    if (store.currentSubTool !== SelectSubTool.RECT) return

    dragCurrentNewSelectionX = x
    dragCurrentNewSelectionY = y
  }

  function endRectSelection() {
    const rect = selectionRect()
    if (!rect) return

    selection = makeCanvasPaintSelection({
      rect,
    })

    selecting = false
  }

  function createFloodSelection(x: number, y: number) {
    const img = state.imageDataRef.get()
    if (!img) return

    const result = floodFillImageDataSelection(
      img,
      x,
      y,
      store.selectFloodContiguous,
      store.selectFloodTolerance,
    )

    if (!result) return

    selection = makeCanvasPaintSelection({
      rect: result.selectionRect,
      mask: result.selectionRect.mask,
    })

    selecting = false
    dragging = false
  }

  function startMovingSelection(mouseX: number, mouseY: number) {
    if (!selection) return

    if (selection.pixels) {
      const rect = selection.current
      const mask = selection.mask

      commit()
      selection = makeCanvasPaintSelection({
        rect,
        mask,
      })
    }

    dragging = true
    selection.startMoving(mouseX, mouseY)
  }

  function startMovingContent(mouseX: number, mouseY: number) {
    if (!selection || dragging) return

    // promotion marquee -> content
    if (!selection.pixels) {
      const pixels = getPixels(selection.original)
      selection.lift(pixels)
    }

    selection.startMoving(mouseX, mouseY)
    dragging = true
  }

  function move(mouseX: number, mouseY: number) {
    if (!selection || !dragging) return
    selection.move(mouseX, mouseY)
  }

  function endMoving() {
    if (!selection) return

    // only moving marquee so reset to new selection
    if (!selection.pixels) {
      selection = makeCanvasPaintSelection({
        rect: selection.current,
        mask: selection.mask,
      })
    }
    dragging = false
  }

  async function copySelection() {
    if (!selection) return

    // if we have selection pixels already copy those
    // otherwise we are in marquee selection so grab pixels from current
    const pixels = selection.pixels ?? getPixels(selection.current)
    await imageDataToPngBlob(pixels, selection.mask)
      .then((blob) => writePngBlobToClipboard(blob))
  }

  async function cutSelection() {
    if (!selection) return

    if (selection.isPasted) {
      await copySelection()
      clearSelection()
      return
    }

    // un-commited possibly moved pixels
    if (selection.pixels) {
      await copySelection()

      canvasWriter.withHistory((mutator) => {
        if (!selection) return
        const o = selection.original
        mutator.clear(o.x, o.y, o.w, o.h, selection.mask)
      })

      clearSelection()
      return
    }

    await copySelection()

    // marquee selection grab current pixels
    canvasWriter.withHistory((mutator) => {
      if (!selection) return
      const o = selection.current
      mutator.clear(o.x, o.y, o.w, o.h, selection.mask)
    })
  }

  async function pasteSelection(e: ClipboardEvent) {
    await getImageDataFromClipboard(e)
      .then(imageData => {
        if (!imageData) return
        clearSelection()

        // @TODO place rect as position always visible to user window
        const rect = {
          x: Math.floor((state.width / 2) - (imageData.width / 2)),
          y: Math.floor((state.height / 2) - (imageData.height / 2)),
          w: imageData.width,
          h: imageData.height,
        }

        selection = makeCanvasPaintSelection({ pastedPixels: imageData, rect })

        selecting = false
      })
  }

  function commit() {
    if (!selection) return
    const mode = store.selectMoveBlendMode

    canvasWriter.withHistory((mutator) => {
      if (!selection?.pixels) return

      if (!selection.isPasted) {
        const o = selection.original
        mutator.clear(o.x, o.y, o.w, o.h, selection.mask)
      }

      const c = selection.current
      const modeFn = selectMoveBlendModeToBlendFn[mode]

      mutator.blendImageData(
        selection.pixels,
        modeFn,
        {
          dx: c.x,
          dy: c.y,
          mask: selection.mask,
        },
      )
    })

    state.imageDataDirty = true
    clearSelection()
  }

  function clearSelection() {
    selection = null
    dragging = false
    selecting = false
    dragStartNewSelectionX = dragStartNewSelectionY = dragCurrentNewSelectionX = dragCurrentNewSelectionY = null
  }

  function selectionHasMoved() {
    if (!selection) return false
    return selection.hasMoved()
  }

  return {
    get currentDraggedRect() {
      return selectionRect()
    },
    get selection() {
      return selection
    },
    get dragging() {
      return dragging
    },
    get selecting() {
      return selecting
    },
    inFloodMode() {
      return store.currentSubTool === SelectSubTool.FLOOD
    },
    createFloodSelection,
    startRectSelection,
    resizeRectSelection,
    endRectSelection,

    startMovingSelection,
    move,
    startMovingContent,
    endMoving,

    commit,
    clearSelection,
    pointInSelection: (x: number, y: number) => selection?.pointInSelection(x, y) ?? false,
    selectionHasMoved,
    cutSelection,
    copySelection,
    pasteSelection,
  }
}