import type { LocalToolContext, LocalToolContexts } from './_canvas-paint-editor-types.ts'
import type { CanvasPaintToolset } from './CanvasPaintToolset.ts'

export type CurrentToolRenderer = ReturnType<typeof makeCurrentToolRenderer>

export function makeCurrentToolRenderer(
  {
    toolset,
    localToolContexts,
  }: {
    toolset: CanvasPaintToolset,
    localToolContexts: LocalToolContexts,
  }) {

  return {
    pixelOverlayDraw(ctx: CanvasRenderingContext2D) {
      const localTool = localToolContexts[toolset.currentTool] as LocalToolContext<any>
      toolset.currentToolHandler.pixelOverlayDraw?.(localTool, ctx)
    },
    screenOverlayDraw(ctx: CanvasRenderingContext2D) {
      const localTool = localToolContexts[toolset.currentTool] as LocalToolContext<any>
      toolset.currentToolHandler.screenOverlayDraw?.(localTool, ctx)
    },
  }
}
