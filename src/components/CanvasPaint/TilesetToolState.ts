import { ref } from 'vue'
import { extractImageData } from '../../lib/util/html-dom/ImageData.ts'
import type { Selection } from './_canvas-editor-types.ts'

export type TilesetToolState = ReturnType<typeof makeTilesetToolState>

export function makeTilesetToolState() {
  let selection: Selection | null = null

  const selecting = ref(false)
  const dragging = ref(false)

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

    selecting.value = true
    dragging.value = false
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
    selecting.value = false
    dragging.value = false
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

  return {
    get selection() {
      return selection
    },

    selecting,
    dragging,
    inSelection,
    startSelection,
    updateSelection,
    moveSelection,
    extractSelectionPixels,
    clearSelection,
  }
}
