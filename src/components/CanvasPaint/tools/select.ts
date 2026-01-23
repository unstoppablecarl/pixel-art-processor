import {
  blendIgnoreTransparent,
  blendImageDataIgnoreSolid,
  blendImageDataIgnoreTransparent,
  blendSourceAlphaOver,
} from '../../../lib/util/html-dom/blit.ts'
import {
  clearImageDataRect,
  extractImageData,
  putImageDataScaled,
  writeImageData,
} from '../../../lib/util/html-dom/ImageData.ts'
import { makeCopyPasteKeys } from '../../../lib/util/html-dom/keyboard.ts'
import type { ToolHandler } from '../_canvas-editor-types.ts'
import type { EditorState } from '../EditorState.ts'

import type { GlobalToolContext } from '../GlobalToolManager.ts'
import type { ToolRenderer } from '../renderer.ts'

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

let clipboard: ImageData | undefined

export function makeSelectTool(toolContext: GlobalToolContext): ToolHandler {

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

  function commit(state: EditorState, renderer: ToolRenderer) {
    const sel = state.selection
    if (!sel?.pixels) return

    const target = state.target?.get()
    if (target && sel.w && sel.h) {
      clearImageDataRect(target, sel.origX, sel.origY, sel.origW, sel.origH)

      const mode = toolContext.selectMoveBlendMode
      if (mode === SelectMoveBlendMode.OVERWRITE) {
        writeImageData(target, sel.pixels, sel.x, sel.y)
      } else if (mode === SelectMoveBlendMode.IGNORE_TRANSPARENT) {
        blendImageDataIgnoreTransparent(target, sel.pixels!, sel.x, sel.y)
      } else if (mode === SelectMoveBlendMode.IGNORE_SOLID) {
        blendImageDataIgnoreSolid(target, sel.pixels!, sel.x, sel.y)
      }
    }

    state.selecting = false
    state.selection = null
    renderer.queueRender()
  }

  return {
    inputBindings: makeCopyPasteKeys(({ state }) => {
      const sel = state.selection
      if (!sel?.pixels) return

      clipboard = sel.pixels
    }, () => {
      // @TODO paste
    }),
    onMouseDown({ state, renderer }, x: number, y: number) {
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
        commit(state, renderer)
        state.selection = makeSelection(x, y)
        state.selecting = true
      }
    },
    onMouseMove({ state, renderer }, x, y) {
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
    onMouseUp({ state, renderer }) {
      const sel = state.selection
      if (!sel) return

      if (state.selecting) {
        mouseUpSelecting(state, sel)
      } else if (sel.dragging) {
        sel.dragging = false
      }
      renderer.queueRender()
    },
    onUnSelectTool({ state, renderer }) {
      commit(state, renderer)
    },
    pixelOverlayDraw({ state }, ctx) {
      const sel = state.selection
      if (!sel || !sel.pixels) return

      ctx.clearRect(sel.origX, sel.origY, sel.origW, sel.origH)

      const mode = toolContext.selectMoveBlendMode
      if (mode === SelectMoveBlendMode.OVERWRITE) {
        ctx.clearRect(sel.x, sel.y, sel.w, sel.h)
        putImageDataScaled(ctx, sel.w, sel.h, sel.pixels, sel.x, sel.y)
      } else if (mode === SelectMoveBlendMode.IGNORE_TRANSPARENT) {
        putImageDataScaled(ctx, sel.w, sel.h, sel.pixels, sel.x, sel.y, blendIgnoreTransparent)
      } else if (mode === SelectMoveBlendMode.IGNORE_SOLID) {
        putImageDataScaled(ctx, sel.w, sel.h, sel.pixels, sel.x, sel.y, blendSourceAlphaOver(0.5))
      }
    },
    screenOverlayDraw({ state }, ctx: CanvasRenderingContext2D) {
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

function mouseUpSelecting(state: EditorState, sel: Selection) {
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