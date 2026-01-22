import {
  clearImageDataRect,
  extractImageData,
  putImageDataScaled,
  writeImageData,
} from '../../../lib/util/html-dom/ImageData.ts'
import type { ToolHandler } from '../_canvas-editor-types.ts'
import type { EditorState } from '../editor-state.ts'
import type { Renderer } from '../renderer.ts'

export enum SelectMoveBlendMode {
  OVERWRITE = 'OVERWRITE',
  IGNORE_TRANSPARENT = 'IGNORE_TRANSPARENT',
  IGNORE_SOLID = 'IGNORE_SOLID'
}

export type Selection = {
  x: number
  y: number
  w: number
  h: number
  pixels: ImageData | null
  dragging: boolean
  offsetX: number
  offsetY: number

  origX: number
  origY: number
  origW: number
  origH: number
}

export function makeSelectTool(state: EditorState, renderer: Renderer): ToolHandler {

  function makeSelection(x: number, y: number): Selection {
    return {
      x,
      y,
      w: 0,
      h: 0,
      pixels: null,
      dragging: false,

      origX: x,
      origY: y,
      origW: 0,
      origH: 0,

      offsetX: 0,
      offsetY: 0,
    }
  }

  function mouseUpSelecting(sel: Selection) {
    // normalize
    if (sel.w < 0) {
      sel.x += sel.w
      sel.w = -sel.w
    }
    if (sel.h < 0) {
      sel.y += sel.h
      sel.h = -sel.h
    }

    sel.origX = sel.x
    sel.origY = sel.y
    sel.origW = sel.w
    sel.origH = sel.h

    const targetImageData = state.target?.get()
    if (targetImageData && sel.w && sel.h) {
      sel.pixels = extractImageData(targetImageData, sel.x, sel.y, sel.w, sel.h)
    }
    state.selecting = false
  }

  function commit() {
    const sel = state.selection
    if (!sel?.pixels) return

    const target = state.target?.get()
    if (target && sel.w && sel.h) {
      clearImageDataRect(target, sel.origX, sel.origY, sel.origW, sel.origH)

      if (SelectMoveBlendMode.OVERWRITE) {
        writeImageData(target, sel.pixels, sel.x, sel.y)
      }
      // else if (SelectMoveBlendMode.IGNORE_TRANSPARENT) {
        // blendImageDataIgnoreTransparent(target, sel.pixels!, sel.x, sel.y)
      // } else if (SelectMoveBlendMode.IGNORE_SOLID) {
        // blendImageDataIgnoreSolid(target, sel.pixels!, sel.x, sel.y)
      // }
    }

    state.selecting = false
    state.selection = null
    renderer.queueRender()
  }

  return {
    onMouseDown(x: number, y: number) {
      if (!state.selection) {
        // start new selection
        state.selection = makeSelection(x, y)
        state.selecting = true

        return
      }

      // check if clicking inside selection
      const sel = state.selection
      const clickedSelection = x >= sel.x
        && x < sel.x + sel.w
        && y >= sel.y
        && y < sel.y + sel.h

      if (clickedSelection) {
        state.selecting = false
        sel.dragging = true
        sel.offsetX = x - sel.x
        sel.offsetY = y - sel.y
      } else {
        // clicked outside → start new selection
        commit()
        state.selection = makeSelection(x, y)
        state.selecting = true
      }
    },
    onMouseMove(x, y) {
      if (!state.selection) return

      if (state.selection?.dragging) {
        const sel = state.selection
        sel.x = x - sel.offsetX
        sel.y = y - sel.offsetY
      } else if (state.selecting) {
        const sel = state.selection
        sel.w = x - sel.x
        sel.h = y - sel.y
      }

      renderer.queueRender()
    },
    onMouseUp() {
      const sel = state.selection
      if (!sel) return

      if (state.selecting) {
        mouseUpSelecting(sel)
      } else if (sel.dragging) {
        sel.dragging = false
      }
      renderer.queueRender()
    },
    onUnSelectTool() {
      commit()
    },
    pixelOverlayDraw(ctx) {
      const sel = state.selection
      if (!sel || !sel.pixels) return

      ctx.clearRect(sel.origX, sel.origY, sel.origW, sel.origH)
      putImageDataScaled(ctx, sel.w, sel.h, sel.pixels, sel.x, sel.y)
    },
    screenOverlayDraw(ctx: CanvasRenderingContext2D) {
      const sel = state.selection
      if (!sel) return

      ctx.strokeStyle = 'cyan'
      ctx.lineWidth = 1
      ctx.strokeRect(
        sel.x * state.scale - 0.5,
        sel.y * state.scale - 0.5,
        sel.w * state.scale + 2,
        sel.h * state.scale + 2,
      )
    },
  }
}
