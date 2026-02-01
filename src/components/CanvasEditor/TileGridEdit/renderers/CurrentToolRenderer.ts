import type { TileId } from '../../../../lib/wang-tiles/WangTileset.ts'
import type { LocalToolContext, LocalToolContexts } from '../_tile-grid-editor-types.ts'
import type { TileGridToolset } from '../TileGridToolset.ts'

export type CurrentToolRenderer = ReturnType<typeof makeCurrentToolRenderer>

export function makeCurrentToolRenderer(
  {
    toolset,
    localToolContexts,
  }: {
    toolset: TileGridToolset,
    localToolContexts: LocalToolContexts
  }) {

  return {
    gridPixelOverlayDraw(ctx: CanvasRenderingContext2D) {
      const localTool = localToolContexts[toolset.currentTool] as LocalToolContext<any>
      toolset.currentToolHandler.gridPixelOverlayDraw?.(localTool, ctx)
    },
    gridScreenOverlayDraw(ctx: CanvasRenderingContext2D) {
      const localTool = localToolContexts[toolset.currentTool] as LocalToolContext<any>
      toolset.currentToolHandler.gridScreenOverlayDraw?.(localTool, ctx)
    },

    tilePixelOverlayDraw(ctx: CanvasRenderingContext2D, tileId: TileId) {
      const localTool = localToolContexts[toolset.currentTool] as LocalToolContext<any>
      toolset.currentToolHandler.tilePixelOverlayDraw?.(localTool, ctx, tileId)
    },
    tileScreenOverlayDraw(ctx: CanvasRenderingContext2D, tileId: TileId) {
      const localTool = localToolContexts[toolset.currentTool] as LocalToolContext<any>
      toolset.currentToolHandler.tileScreenOverlayDraw?.(localTool, ctx, tileId)
    },

  }
}
