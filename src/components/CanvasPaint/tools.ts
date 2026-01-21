import type { Point } from '../../lib/node-data-types/BaseDataStructure.ts'
import { getPerfectCircleCoords, getRectCenterCoords, interpolateLine } from '../../lib/util/data/Grid.ts'
import { type EditorState, type Renderer, Tool } from './renderer.ts'

export function makeBrushTool(state: EditorState): ToolHandler {

  function paint(x: number, y: number) {
    let pixels: Point[] = []
    const { width, height, brushSize, brushShape } = state
    if (brushShape === 'circle') {
      pixels = getPerfectCircleCoords(x, y, brushSize / 2, width, height)
    } else {
      pixels = getRectCenterCoords(x, y, brushSize, brushSize, width, height)
    }

    state?.emitSetPixels?.(pixels)
  }

  return {
    onMouseDown: paint,
    onMouseMove(x: number, y: number): void {
      const { lastX, lastY } = state

      state.cursorX = x
      state.cursorY = y

      if (state.isDrawing) {
        // Interpolate between last position and current position
        const points = interpolateLine(
          Math.floor(lastX),
          Math.floor(lastY),
          Math.floor(x),
          Math.floor(y),
        )

        for (const point of points) {
          const ix = Math.floor(point.x)
          const iy = Math.floor(point.y)
          paint(ix, iy)
        }

        state.lastX = x
        state.lastY = y
      }
    },
  }
}

function makeSelectTool(state: EditorState, renderer: Renderer): ToolHandler {

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
  }
}

type Shared = {
  onMouseMove: (x: number, y: number) => void,
  onMouseDown: (x: number, y: number) => void,
  onMouseUp: (x: number, y: number) => void,
  onMouseLeave: () => void,
}
type ToolHandler = Partial<Shared> & {
  onSelectTool?: () => void,
  onUnSelectTool?: () => void,
}

export type ToolManager = Shared & {
  setTool: (tool: Tool) => void
}

export function makeToolManager(state: EditorState, renderer: Renderer): ToolManager {
  const tools: Record<Tool, ToolHandler> = {
    [Tool.BRUSH]: makeBrushTool(state),
    [Tool.SELECT]: makeSelectTool(state, renderer),
  }

  return {
    onMouseMove(x: number, y: number) {
      state.mouseIsOver = true
      state.cursorX = x
      state.cursorY = y

      tools[state.tool]?.onMouseMove?.(x, y)

      renderer.queueRender()
    },
    onMouseDown(x: number, y: number) {
      state.isDrawing = true

      tools[state.tool]?.onMouseDown?.(x, y)

      state.lastX = x
      state.lastY = y

      // nextTick(() => renderer.queueRender())
      renderer.queueRender()
    },
    onMouseUp() {
      state.isDrawing = false
    },
    onMouseLeave() {
      state.isDrawing = false
      state.mouseIsOver = false

      tools[state.tool]?.onMouseLeave?.()
      // Clear cursor
      renderer.updateCursorCache()
      renderer.queueRender()
    },
    setTool(tool: Tool) {
      tools[state.tool]?.onUnSelectTool?.()
      state.tool = tool
      tools[tool]?.onSelectTool?.()

      renderer.queueRender()
    },
  }
}