import type { EditorState, Renderer } from '../renderer.ts'
import type { ToolHandler } from '../tools.ts'

export function makeSelectTool(state: EditorState, renderer: Renderer): ToolHandler {

  return {
    onMouseDown(x: number, y: number) {
      if (!state.selection) {
        // start new selection
        state.selection = {
          x,
          y,
          w: 0,
          h: 0,
          pixels: null,
          dragging: false,
          offsetX: 0,
          offsetY: 0,
        }
      } else {
        // check if clicking inside selection
        const sel = state.selection
        if (x >= sel.x && x < sel.x + sel.w &&
          y >= sel.y && y < sel.y + sel.h) {
          sel.dragging = true
          sel.offsetX = x - sel.x
          sel.offsetY = y - sel.y
        } else {
          // clicked outside → start new selection
          state.selection = {
            x,
            y,
            w: 0,
            h: 0,
            pixels: null,
            dragging: false,
            offsetX: 0,
            offsetY: 0,
          }
        }
      }
    },
    onMouseMove(x, y) {
      if (!state.selection) return

      if (state.selection?.dragging) {
        const sel = state.selection
        sel.x = x - sel.offsetX
        sel.y = y - sel.offsetY
      } else {
        const sel = state.selection
        sel.w = x - sel.x
        sel.h = y - sel.y
      }

      renderer.queueRender()
    },
    onMouseUp() {
      const sel = state.selection
      if (!sel) return

      sel.dragging = false

      // normalize
      if (sel.w < 0) {
        sel.x += sel.w
        sel.w = -sel.w
      }
      if (sel.h < 0) {
        sel.y += sel.h
        sel.h = -sel.h
      }

      if (!renderer.ctx) return

      // extract pixels
      sel.pixels = renderer.ctx.getImageData(sel.x, sel.y, sel.w, sel.h)

      // clear original area
      renderer.ctx.clearRect(sel.x, sel.y, sel.w, sel.h)

      renderer.queueRender()
    },
    onSelectTool() {
      // commit previous selection if switching away
      if (state.selection?.pixels) {
        renderer.ctx!.putImageData(state.selection.pixels, state.selection.x, state.selection.y)
        state.selection = null
        renderer.queueRender()
      }
    },

    onUnSelectTool() {
      // commit selection when leaving the tool
      if (state.selection?.pixels && renderer.ctx) {
        renderer.ctx.putImageData(
          state.selection.pixels,
          state.selection.x,
          state.selection.y,
        )
        state.selection = null
        renderer.queueRender()
      }
    },
    draw(ctx: CanvasRenderingContext2D) {
      const sel = state.selection
      if (!sel) return

      ctx.strokeStyle = 'cyan'
      ctx.lineWidth = 1 / state.scale
      ctx.strokeRect(sel.x, sel.y, sel.w, sel.h)

      if (sel.pixels) {
        ctx.setTransform(state.scale, 0, 0, state.scale, 0, 0)
        ctx.putImageData(sel.pixels, sel.x, sel.y)
        ctx.setTransform(1, 0, 0, 1, 0, 0)
      }
    },
  }
}
