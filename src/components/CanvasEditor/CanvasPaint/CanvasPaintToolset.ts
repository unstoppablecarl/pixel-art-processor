import { type CanvasEditToolStore, useCanvasEditToolStore } from '../../../lib/store/canvas-edit-tool-store.ts'
import { Tool } from '../_core-editor-types.ts'
import { makeBrushToolState } from '../_support/tools/BrushToolState.ts'
import { makeToolset } from '../Toolset.ts'
import type { BaseLocalToolContext, LocalToolStates } from './_canvas-paint-editor-types.ts'
import type { CanvasPaintEditorState } from './CanvasPaintEditorState.ts'
import { makeCanvasPaintSelectToolState } from './CanvasPaintSelectToolState.ts'
import type { CanvasRenderer } from './CanvasRenderer.ts'
import type { CanvasPaintWriter } from './data/CanvasPaintWriter.ts'
import { type CanvasPaintBrushToolHandler, makeBrushTool } from './tools/brush.ts'
import { type CanvasPaintSelectToolHandler, makeCanvasPaintSelectTool } from './tools/select.ts'

export type CanvasPaintToolset = ReturnType<typeof makeCanvasPaintToolset>

export function makeCanvasPaintToolset(
  {
    store = useCanvasEditToolStore(),
    state,
    canvasRenderer,
    canvasWriter,
  }: {
    store?: CanvasEditToolStore
    state: CanvasPaintEditorState,
    canvasRenderer: CanvasRenderer,
    canvasWriter: CanvasPaintWriter,
  },
) {

  const localBase: BaseLocalToolContext = {
    state,
    canvasRenderer,
    canvasWriter,
  }

  const tools = {
    [Tool.BRUSH]: makeBrushTool(store) as CanvasPaintBrushToolHandler,
    [Tool.SELECT]: makeCanvasPaintSelectTool(store) as CanvasPaintSelectToolHandler,
  }

  const localToolStates: LocalToolStates = {
    [Tool.BRUSH]: makeBrushToolState({ state }),
    [Tool.SELECT]: makeCanvasPaintSelectToolState({
      state,
      canvasRenderer,
    }),
  }

  return makeToolset(store, tools, localToolStates, localBase)
}