import { type CanvasEditToolStore, useCanvasEditToolStore } from '../../../lib/store/canvas-edit-tool-store.ts'
import { Tool } from '../_core/_core-editor-types.ts'
import { makeToolset } from '../_core/Toolset.ts'
import type { TileGridEditorToolContext } from './_tile-grid-editor-types.ts'
import type { TileSheetWriter } from './data/TileSheetWriter.ts'
import type { TileGridRenderer } from './renderers/TileGridRenderer.ts'
import type { TileGridEditorState } from './TileGridEditorState.ts'
import { makeBrushTool, type TileGridBrushToolHandler } from './tools/brush.ts'
import { makeSelectTool, type TileGridSelectToolHandler } from './tools/select.ts'

export type TileGridToolset = ReturnType<typeof makeTileGridToolset>

export function makeTileGridToolset(
  {
    state,
    tileSheetWriter,
    gridRenderer,
    store = useCanvasEditToolStore(),
  }: {
    state: TileGridEditorState,
    tileSheetWriter: TileSheetWriter,
    gridRenderer: TileGridRenderer,
    store?: CanvasEditToolStore
  }) {

  const context: TileGridEditorToolContext = {
    state,
    gridRenderer,
    tileSheetWriter,
  }

  const handlers = {
    [Tool.BRUSH]: makeBrushTool(context, store) as TileGridBrushToolHandler,
    [Tool.SELECT]: makeSelectTool(context, store) as TileGridSelectToolHandler,
  } as const

  return makeToolset(store, handlers)
}