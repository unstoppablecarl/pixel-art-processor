import { type CanvasEditToolStore, useCanvasEditToolStore } from '../../../lib/store/canvas-edit-tool-store.ts'
import { Tool } from '../_core-editor-types.ts'
import { makeToolset } from '../Toolset.ts'
import { makeBrushTool, type TileGridBrushToolHandler } from './tools/brush.ts'
import { makeSelectTool, type TileGridSelectToolHandler } from './tools/select.ts'

let TOOLSET: TileGridToolset | undefined

export function useTileGridToolset() {
  if (!TOOLSET) {
    TOOLSET = makeTileGridToolset(useCanvasEditToolStore())
  }
  return TOOLSET
}

export type TileGridToolset = ReturnType<typeof makeTileGridToolset>

export function makeTileGridToolset(store: CanvasEditToolStore) {

  const tools = {
    [Tool.BRUSH]: makeBrushTool(store) as TileGridBrushToolHandler,
    [Tool.SELECT]: makeSelectTool(store) as TileGridSelectToolHandler,
  } as const

  return makeToolset(store, tools)
}