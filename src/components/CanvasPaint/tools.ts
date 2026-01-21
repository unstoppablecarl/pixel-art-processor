import { type EditorState, type Renderer, Tool } from './renderer.ts'
import { makeBrushTool } from './tools/brush.ts'
import { makeSelectTool } from './tools/select.ts'

type Shared = {
  onMouseMove: (x: number, y: number) => void,
  onMouseDown: (x: number, y: number) => void,
  onMouseUp: (x: number, y: number) => void,
  onMouseLeave: () => void,
}
export type ToolHandler = Partial<Shared> & {
  onSelectTool?: () => void,
  onUnSelectTool?: () => void,
  draw?: (ctx: CanvasRenderingContext2D) => void
}

export type ToolManager = Shared & {
  setTool: (tool: Tool) => void,
  drawCurrentTool: (ctx: CanvasRenderingContext2D) => void
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
    drawCurrentTool(ctx) {
      tools.SELECT.draw!(ctx)
      tools[state.tool]?.draw?.(ctx)
    },
  }
}