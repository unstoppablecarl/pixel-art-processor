import { type CanvasEditToolStore, useCanvasEditToolStore } from '../../../lib/store/canvas-edit-tool-store.ts'
import { Tool } from '../_core/_core-editor-types.ts'
import { makeToolset } from '../_core/Toolset.ts'
import type { CanvasPaintToolContext } from './_canvas-paint-editor-types.ts'
import type { CanvasPaintEditorState } from './CanvasPaintEditorState.ts'
import type { CanvasRenderer } from './CanvasRenderer.ts'
import type { CanvasPaintWriter } from './data/CanvasPaintWriter.ts'
import { makeBrushTool } from './tools/brush.ts'
import { makeCanvasPaintSelectTool } from './tools/select.ts'

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

  const context: CanvasPaintToolContext = {
    state,
    canvasRenderer,
    canvasWriter,
  }

  const handlers = {
    [Tool.BRUSH]: makeBrushTool(context, store),
    [Tool.SELECT]: makeCanvasPaintSelectTool(context, store),
  }

  return makeToolset(store, handlers)
}