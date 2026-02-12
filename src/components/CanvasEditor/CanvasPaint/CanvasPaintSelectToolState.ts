import { type CanvasEditToolStore, useCanvasEditToolStore } from '../../../lib/store/canvas-edit-tool-store.ts'
import { type Rect, trimRectBounds } from '../../../lib/util/data/Rect.ts'
import { imageDataToPngBlob } from '../../../lib/util/html-dom/blit.ts'
import { getImageDataFromClipboard, writePngBlobToClipboard } from '../../../lib/util/html-dom/clipboard.ts'
import { extractImageData, floodFillImageDataSelection } from '../../../lib/util/html-dom/ImageData.ts'
import { BlendMode, SelectSubTool } from '../_core/_core-editor-types.ts'
import { selectMoveBlendModeToBlendFn } from '../_core/tools/selection-helpers.ts'
import type { CanvasPaintEditorState } from './CanvasPaintEditorState.ts'
import type { CanvasRenderer } from './CanvasRenderer.ts'
import type { CanvasPaintWriter } from './data/CanvasPaintWriter.ts'

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
  type LocalSelection = {
    pixels: ImageData
    mask: Uint8Array | null
    original: Rect
    current: Rect
    dragStartX: number | null
    dragStartY: number | null
    dragStartRect: Rect | null,
    isPasted: boolean
  }

  let selection: LocalSelection | null = null
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

  function startRectSelection(x: number, y: number) {
    selecting = true
    dragging = false
    dragStartNewSelectionX = x
    dragStartNewSelectionY = y
    dragCurrentNewSelectionX = x
    dragCurrentNewSelectionY = y
  }

  function updateRect(x: number, y: number) {
    dragCurrentNewSelectionX = x
    dragCurrentNewSelectionY = y
    canvasRenderer.queueRender()
  }

  function finalizeRectSelection() {
    const img = state.imageDataRef.get()
    if (!img) return

    const r = selectionRect()
    if (!r) return

    trimRectBounds(r, { x: 0, y: 0, w: state.width, h: state.height })
    const pixels = extractImageData(img, r.x, r.y, r.w, r.h)

    selection = {
      pixels,
      mask: null,
      original: { ...r },
      current: { ...r },
      dragStartX: null,
      dragStartY: null,
      dragStartRect: null,
      isPasted: false,
    }

    selecting = false
    dragStartNewSelectionX = dragStartNewSelectionY = dragCurrentNewSelectionX = dragCurrentNewSelectionY = null
    canvasRenderer.queueRender()
  }

  function finalizeFloodSelection(x: number, y: number) {
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

    selection = {
      pixels: result.pixels,
      mask: result.selectionRect.mask,
      original: { ...result.selectionRect },
      current: { ...result.selectionRect },
      dragStartX: null,
      dragStartY: null,
      dragStartRect: null,
      isPasted: false,
    }

    selecting = false
    dragging = false
    canvasRenderer.queueRender()
  }

  function dragStart(mouseX: number, mouseY: number) {
    if (!selection) return

    const r = selection.current
    if (
      mouseX < r.x || mouseX >= r.x + r.w ||
      mouseY < r.y || mouseY >= r.y + r.h
    ) return

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

  function copySelection() {
    if (!selection) return
    if (selectionHasMoved()) return
    if (selection.isPasted) return

    const { pixels, mask } = selection
    imageDataToPngBlob(pixels, mask)
      .then((blob) => writePngBlobToClipboard(blob))
  }

  function cutSelection() {
    if (!selection) return
    if (selectionHasMoved()) return
    if (selection.isPasted) return

    canvasWriter.withHistory((mutator) => {
      if (!selection) return
      const o = selection.current
      mutator.clear(o.x, o.y, o.w, o.h, selection.mask)
    })

    const { pixels, mask } = selection
    imageDataToPngBlob(pixels, mask)
      .then((blob) => writePngBlobToClipboard(blob))
  }

  function pasteSelection(e: ClipboardEvent) {
    getImageDataFromClipboard(e)
      .then(imageData => {
        if (!imageData) return
        clearSelection()

        const original = { x: 5, y: 5, w: imageData.width, h: imageData.height }
        selection = {
          pixels: imageData,
          original,
          current: { ...original },
          dragStartX: null,
          dragStartY: null,
          dragStartRect: null,
          isPasted: true,
          mask: null,
        }

        selecting = false
        canvasRenderer.queueRender()
      })
  }

  function commit(mode: BlendMode) {
    if (!selection) return

    canvasWriter.withHistory((mutator) => {
      if (!selection) return

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
    selection = null
    dragging = false
    selecting = false
    canvasRenderer.queueRender()
  }

  function clearSelection() {
    selection = null
    dragging = false
    selecting = false
    dragStartNewSelectionX = dragStartNewSelectionY = dragCurrentNewSelectionX = dragCurrentNewSelectionY = null
    canvasRenderer.queueRender()
  }

  function pointInSelection(px: number, py: number) {
    if (!selection) return false

    const r = selection.current

    if (selection.mask) {
      const lx = px - r.x
      const ly = py - r.y

      if (lx < 0 || ly < 0 || lx >= r.w || ly >= r.h) return false

      return selection.mask[ly * r.w + lx] !== 0
    }

    return (
      px >= r.x && px < r.x + r.w &&
      py >= r.y && py < r.y + r.h
    )
  }

  function selectionHasMoved() {
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
    get mask() {
      return selection?.mask ?? null
    },
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
    startRectSelection,
    finalizeFloodSelection,
    inFloodMode() {
      return store.currentSubTool === SelectSubTool.FLOOD
    },
    updateSelection(x: number, y: number) {
      if (store.currentSubTool === SelectSubTool.RECT) updateRect(x, y)
    },
    finalizeRectSelection,

    dragStart,
    moveSelection,
    dragEnd,
    commit,
    clearSelection,
    pointInSelection,
    selectionHasMoved,
    cutSelection,
    copySelection,
    pasteSelection,
    draw,
  }
}