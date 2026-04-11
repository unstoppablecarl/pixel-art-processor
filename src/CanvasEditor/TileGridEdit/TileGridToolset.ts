import { type Ref } from 'vue'
import { type CanvasEditToolStore, useCanvasEditToolStore } from '../../lib/store/canvas-edit-tool-store.ts'
import { Tool } from '../_core/_core-editor-types.ts'
import { makeUIContext } from '../_core/tools/tool-cursor-css-states.ts'
import { makeToolset } from '../_core/Toolset.ts'
import type { TileGridEditorToolContext } from './_tile-grid-editor-types.ts'
import type { TileSheetWriter } from './data/TileSheetWriter.ts'
import type { TileGridRenderer } from './renderers/TileGridRenderer.ts'
import type { TileGridEditorState } from './TileGridEditorState.ts'
import { makeBrushTool } from './tools/brush.ts'
import { makeSelectTool } from './tools/select.ts'

export type TileGridToolset = ReturnType<typeof makeTileGridToolset>

export function makeTileGridToolset(
  {
    store = useCanvasEditToolStore(),
    state,
    gridRenderer,
    tileSheetWriter,
    currentCursorCssClass,
  }: {
    store?: CanvasEditToolStore,
    state: TileGridEditorState,
    gridRenderer: TileGridRenderer,
    tileSheetWriter: TileSheetWriter,
    currentCursorCssClass: Ref<string | null>
  },
) {

  const context: TileGridEditorToolContext = {
    state,
    gridRenderer,
    tileSheetWriter,
  }

  const handlers = {
    [Tool.BRUSH]: makeBrushTool(
      context,
      store,
    ),
    [Tool.SELECT]: makeSelectTool(
      context,
      makeUIContext(Tool.SELECT, currentCursorCssClass),
      store,
    ),
  }

  return makeToolset(store, handlers)
}