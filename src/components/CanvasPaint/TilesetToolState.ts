import { ref } from 'vue'
import { extractImageData } from '../../lib/util/html-dom/ImageData.ts'
import type { ImageDataRef } from '../../lib/vue/vue-image-data.ts'
import type { Selection } from './_canvas-editor-types.ts'

export type TilesetToolState = ReturnType<typeof makeTilesetToolState>

// called in the vue component that has CanvasPaint child component(s)
export function makeTilesetToolState() {
  // Selection object is NOT reactive — this avoids Vue overhead
  let selection: Selection | null = null

  // These flags *are* reactive because UI/tool logic may watch them
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
      dragging: false,
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

  function extractSelectionPixels(tilesetImageRef: ImageDataRef) {
    if (!selection) return
    const sel = selection

    normalizeSelection(sel)

    sel.origX = sel.x
    sel.origY = sel.y
    sel.origW = sel.w
    sel.origH = sel.h

    const target = tilesetImageRef.get()
    if (target && sel.w && sel.h) {
      sel.pixels = extractImageData(target, sel.x, sel.y, sel.w, sel.h)
    }
  }

  function clearSelection() {
    selection = null
    selecting.value = false
    dragging.value = false
  }

  // function getSelectionTileOverlaps(selection, tileSize) {
  //   if (!selection) return []
  //
  //   return tilesetManager.tileGrid.value.getOverlappingTiles(
  //     {
  //       x: selection.x,
  //       y: selection.y,
  //       w: selection.w,
  //       h: selection.h,
  //     },
  //     tileSize
  //   )
  // }

  return {
    // expose selection as a getter so tools can read it
    get selection() {
      return selection
    },

    selecting,
    dragging,

    startSelection,
    updateSelection,
    moveSelection,
    extractSelectionPixels,
    clearSelection,
  }
}
