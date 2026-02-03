import { type CanvasEditToolStore, useCanvasEditToolStore } from '../../../lib/store/canvas-edit-tool-store.ts'
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

  const tools = {
    [Tool.BRUSH]: makeBrushTool(store) as CanvasPaintBrushToolHandler,
    [Tool.SELECT]: makeCanvasPaintSelectTool(store) as CanvasPaintSelectToolHandler,
  }

  return makeToolset(store, tools)
}