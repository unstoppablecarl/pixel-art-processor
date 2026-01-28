import type { TileId } from '../../../lib/wang-tiles/WangTileset.ts'
import type { LocalToolContext, LocalToolContexts } from '../_canvas-editor-types.ts'
import type { GlobalToolManager } from '../GlobalToolManager.ts'

export type CurrentToolRenderer = ReturnType<typeof makeCurrentToolRenderer>

export function makeCurrentToolRenderer(
  {
    globalToolManager,
    localToolContexts,
  }: {
    globalToolManager: GlobalToolManager,
    localToolContexts: LocalToolContexts
  }) {

  return {
    gridPixelOverlayDraw(ctx: CanvasRenderingContext2D) {
      const localTool = localToolContexts[globalToolManager.currentTool] as LocalToolContext<any>
      globalToolManager.currentToolHandler.gridPixelOverlayDraw?.(localTool, ctx)
    },
    gridScreenOverlayDraw(ctx: CanvasRenderingContext2D) {
      const localTool = localToolContexts[globalToolManager.currentTool] as LocalToolContext<any>
      globalToolManager.currentToolHandler.gridScreenOverlayDraw?.(localTool, ctx)
    },

    tilePixelOverlayDraw(ctx: CanvasRenderingContext2D, tileId: TileId) {
      const localTool = localToolContexts[globalToolManager.currentTool] as LocalToolContext<any>
      globalToolManager.currentToolHandler.tilePixelOverlayDraw?.(localTool, ctx, tileId)
    },
    tileScreenOverlayDraw(ctx: CanvasRenderingContext2D, tileId: TileId) {
      const localTool = localToolContexts[globalToolManager.currentTool] as LocalToolContext<any>
      globalToolManager.currentToolHandler.tileScreenOverlayDraw?.(localTool, ctx, tileId)
    },

  }
}
