import { Tool } from './_canvas-editor-types.ts'
import { makeEditorState } from './EditorState.ts'
import { useGlobalToolManager } from './GlobalToolManager.ts'
import { makeRenderer } from './renderer.ts'

export type LocalToolManager = ReturnType<typeof makeLocalToolManager>

export function makeLocalToolManager(globalToolManager = useGlobalToolManager()) {
  const state = makeEditorState()
  const renderer = makeRenderer(state, globalToolManager.toolContext)
  const local = { state, renderer }

  return {
    renderer,
    state,
    onMouseMove(x: number, y: number) {
      globalToolManager.setActiveLocal(local)
      state.mouseIsOver = true
      state.cursorX = x
      state.cursorY = y

      globalToolManager.currentToolHandler?.onMouseMove?.(local, x, y)

      renderer.queueRender()
    },
    onMouseDown(x: number, y: number) {
      globalToolManager.setActiveLocal(local)

      state.isDrawing = true

      globalToolManager.currentToolHandler?.onMouseDown?.(local, x, y)

      state.lastX = x
      state.lastY = y

      renderer.queueRender()
    },
    onMouseUp(x: number, y: number) {
      globalToolManager.setActiveLocal(local)

      state.isDrawing = false
      globalToolManager.currentToolHandler?.onMouseUp?.(local, x, y)
    },
    onMouseLeave() {
      state.isDrawing = false
      state.mouseIsOver = false

      globalToolManager.currentToolHandler?.onMouseLeave?.(local)
      // Clear cursor
      renderer.cursor.updateCache()
      renderer.queueRender()
    },
    currentToolPixelOverlayDraw(ctx: CanvasRenderingContext2D) {
      globalToolManager.tools.SELECT.pixelOverlayDraw!(local, ctx)
      if (state.tool !== Tool.SELECT) {
        globalToolManager.currentToolHandler?.pixelOverlayDraw?.(local, ctx)
      }
    },
    currentToolScreenOverlayDraw(ctx: CanvasRenderingContext2D) {
      globalToolManager.tools.SELECT.screenOverlayDraw!(local, ctx)
      if (state.tool !== Tool.SELECT) {
        globalToolManager.currentToolHandler?.screenOverlayDraw?.(local, ctx)
      }
    },
  }
}
