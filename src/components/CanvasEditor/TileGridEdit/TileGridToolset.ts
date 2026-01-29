import {
  type CanvasPaintToolStore,
  useCanvasPaintToolStore,
  useGlobalToolContext,
} from '../../../lib/store/canvas-paint-tool-store.ts'
import { Tool } from '../_canvas-editor-types.ts'
import { makeToolset } from '../Toolset.ts'
import { type BrushToolHandler, makeBrushTool } from './tools/brush.ts'
import { makeSelectTool, type SelectToolHandler } from './tools/select.ts'

let TOOLSET: TileGridToolset | undefined

export function useTileGridToolset() {
  if (!TOOLSET) {
    TOOLSET = makeTileGridToolset(useCanvasPaintToolStore())
  }
  return TOOLSET
}

export type TileGridToolset = ReturnType<typeof makeTileGridToolset>

export function makeTileGridToolset(store: CanvasPaintToolStore) {
  const toolContext = useGlobalToolContext(store)

  const tools = {
    [Tool.BRUSH]: makeBrushTool(toolContext) as BrushToolHandler,
    [Tool.SELECT]: makeSelectTool(toolContext) as SelectToolHandler,
  }

  return makeToolset(store, tools)
}