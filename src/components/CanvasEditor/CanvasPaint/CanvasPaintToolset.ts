import {
  type CanvasEditToolStore,
  useCanvasEditToolStore,
  useGlobalToolContext,
} from '../../../lib/store/canvas-edit-tool-store.ts'
import { Tool } from '../_core-editor-types.ts'
import { makeToolset } from '../Toolset.ts'
import { type CanvasPaintBrushToolHandler, makeBrushTool } from './tools/brush.ts'
import { type CanvasPaintSelectToolHandler, makeCanvasPaintSelectTool } from './tools/select.ts'

let TOOLSET: CanvasPaintToolset | undefined

export function useCanvasPaintToolset() {
  if (!TOOLSET) {
    TOOLSET = makeCanvasPaintToolset(useCanvasEditToolStore())
  }
  return TOOLSET
}

export type CanvasPaintToolset = ReturnType<typeof makeCanvasPaintToolset>

export function makeCanvasPaintToolset(store: CanvasEditToolStore) {
  const toolContext = useGlobalToolContext(store)

  const tools = {
    [Tool.BRUSH]: makeBrushTool(toolContext) as CanvasPaintBrushToolHandler,
    [Tool.SELECT]: makeCanvasPaintSelectTool(toolContext) as CanvasPaintSelectToolHandler,
  }

  return makeToolset(store, tools, toolContext)
}