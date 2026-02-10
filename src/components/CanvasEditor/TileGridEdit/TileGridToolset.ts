import { type CanvasEditToolStore, useCanvasEditToolStore } from '../../../lib/store/canvas-edit-tool-store.ts'
import { Tool } from '../_core-editor-types.ts'
import { makeBrushToolState } from '../_support/tools/BrushToolState.ts'
import { makeToolset } from '../Toolset.ts'
import type { BaseLocalToolContext, LocalToolStates } from './_tile-grid-editor-types.ts'
import type { TileSheetWriter } from './data/TileSheetWriter.ts'
import type { TileGridRenderer } from './renderers/TileGridRenderer.ts'
import type { TileGridEditorState } from './TileGridEditorState.ts'
import { makeTileGridSelectionToolState } from './TileGridSelectionToolState.ts'
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

  const localToolStates: LocalToolStates = {
    [Tool.BRUSH]: makeBrushToolState({ state }),
    [Tool.SELECT]: makeTileGridSelectionToolState({
      state,
      tileSheetWriter,
      gridRenderer,
    }),
  }

  const localBase: BaseLocalToolContext = {
    state,
    gridRenderer,
    tileSheetWriter,
  }

  const tools = {
    [Tool.BRUSH]: makeBrushTool(store) as TileGridBrushToolHandler,
    [Tool.SELECT]: makeSelectTool(store) as TileGridSelectToolHandler,
  } as const

  return makeToolset(store, tools, localToolStates, localBase)
}