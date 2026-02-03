import type { RectBounds } from '../../../lib/util/data/Bounds.ts'
import { trimRectBounds } from '../../../lib/util/data/Rect.ts'
import { clearImageDataRect, extractImageData } from '../../../lib/util/html-dom/ImageData.ts'
import { BlendMode } from '../_core-editor-types.ts'
import { selectMoveBlendModeToWriter } from '../_support/selection-helpers.ts'
import type { CanvasPaintEditorState } from './CanvasPaintEditorState.ts'
import type { CanvasRenderer } from './CanvasRenderer.ts'

export type CanvasPaintSelectionToolState = ReturnType<typeof makeCanvasPaintSelectionToolState>

export function makeCanvasPaintSelectionToolState(
  {
    state,
    canvasRenderer,
  }: {
    state: CanvasPaintEditorState,
    canvasRenderer: CanvasRenderer
  }) {

  type LocalSelection = {
    pixels: ImageData,
    original: RectBounds,
    current: RectBounds,

    dragStartX: number | null,
    dragStartY: number | null,
    dragStartRect: RectBounds | null,
  }

  let selection: LocalSelection | null = null

  let selecting = false
  let dragging = false

  let dragStartNewSelectionX: number | null = null
  let dragStartNewSelectionY: number | null = null

  let dragCurrentNewSelectionX: number | null = null
  let dragCurrentNewSelectionY: number | null = null

  function startSelection(x: number, y: number) {
    if (selection) {
      selection = null
    }

    selecting = true
    dragging = false

    dragStartNewSelectionX = x
    dragStartNewSelectionY = y
    dragCurrentNewSelectionX = x
    dragCurrentNewSelectionY = y
  }

  function updateSelection(x: number, y: number) {
    if (!selecting) return
    dragCurrentNewSelectionX = x
    dragCurrentNewSelectionY = y
    canvasRenderer.queueRender()
  }

  function finalizeSelection() {
    if (!selecting) return
    if (dragStartNewSelectionX == null || dragStartNewSelectionY == null) return
    if (dragCurrentNewSelectionX == null || dragCurrentNewSelectionY == null) return

    const imgData = state.imageDataRef.get()
    if (!imgData) return

    const r = selectionRect()
    if (!r) return
    trimRectBounds(r, { x: 0, y: 0, w: state.width, h: state.height })

    const pixels = extractImageData(imgData, r.x, r.y, r.w, r.h)

    selection = {
      pixels,
      original: { ...r },
      current: { ...r },

      dragStartX: null,
      dragStartY: null,
      dragStartRect: null,
    }

    clearState()
    canvasRenderer.queueRender()
  }

  function clearState() {
    selecting = false
    dragging = false

    dragStartNewSelectionX = null
    dragStartNewSelectionY = null
    dragCurrentNewSelectionX = null
    dragCurrentNewSelectionY = null
  }

  function dragStart(mouseX: number, mouseY: number) {
    if (!selection) return

    // Check if click is inside current rect
    const r = selection.current
    if (
      mouseX < r.x || mouseX >= r.x + r.w ||
      mouseY < r.y || mouseY >= r.y + r.h
    ) {
      return
    }

    dragging = true
    selection.dragStartX = mouseX
    selection.dragStartY = mouseY
    selection.dragStartRect = { ...selection.current }
  }

  function moveSelection(mouseX: number, mouseY: number) {
    if (!selection || !dragging) return
    if (selection.dragStartX == null || selection.dragStartY == null) return
    if (!selection.dragStartRect) return

    const dx = mouseX - selection.dragStartX
    const dy = mouseY - selection.dragStartY

    selection.current = {
      x: selection.dragStartRect.x + dx,
      y: selection.dragStartRect.y + dy,
      w: selection.dragStartRect.w,
      h: selection.dragStartRect.h,
    }

    canvasRenderer.queueRender()
  }

  function dragEnd() {
    dragging = false
  }

  function pointInSelection(px: number, py: number) {
    if (!selection) return false
    const r = selection.current
    return (
      px >= r.x && px < r.x + r.w &&
      py >= r.y && py < r.y + r.h
    )
  }

  function commit(mode: BlendMode) {
    if (!selection) return
    const imgData = state.imageDataRef.get()
    if (!imgData) return

    const r = selection.original
    clearImageDataRect(state.imageDataRef.get()!, r.x, r.y, r.w, r.h)

    const c = selection.current

    const writer = selectMoveBlendModeToWriter[mode]
    writer(state.imageDataRef.get()!, selection.pixels!, c.x, c.y)
    state.imageDataDirty = true
    selection = null
    dragging = false
    canvasRenderer.queueRender()
  }

  function clearSelection() {
    selection = null
    clearState()
    canvasRenderer.queueRender()
  }

  function selectionRect(): RectBounds | undefined {
    if (
      dragCurrentNewSelectionX !== null &&
      dragCurrentNewSelectionY !== null &&
      dragStartNewSelectionX !== null &&
      dragStartNewSelectionY !== null
    ) {
      const x1 = Math.min(dragStartNewSelectionX, dragCurrentNewSelectionX)
      const y1 = Math.min(dragStartNewSelectionY, dragCurrentNewSelectionY)
      const x2 = Math.max(dragStartNewSelectionX, dragCurrentNewSelectionX)
      const y2 = Math.max(dragStartNewSelectionY, dragCurrentNewSelectionY)

      return {
        x: x1,
        y: y1,
        w: x2 - x1,
        h: y2 - y1,
      }
    }
  }

  function selectionHasMoved(): boolean {
    if (!selection) return false
    const o = selection.original
    const c = selection.current
    return o.x !== c.x || o.y !== c.y
  }

  function draw() {
    canvasRenderer.queueRender()
  }

  return {
    get pixels() {
      return selection?.pixels ?? null
    },
    get currentDraggedRect(): RectBounds | undefined {
      return selectionRect()
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

    selectionHasMoved,
    draw,

    startSelection,
    updateSelection,
    finalizeSelection,

    dragStart,
    dragEnd,
    moveSelection,
    pointInSelection,
    commit,
    clearSelection,
  }
}