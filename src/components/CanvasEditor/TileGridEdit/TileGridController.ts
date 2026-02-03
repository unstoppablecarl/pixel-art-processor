import { ref, toRef, watch } from 'vue'
import { useUIStore } from '../../../lib/store/ui-store.ts'
import type { TileId } from '../../../lib/wang-tiles/WangTileset.ts'
import { type BaseToolManagerSettings, defineToolManager, Tool } from '../_core-editor-types.ts'
import { makeGetCurrentCursorCssClass } from '../_support/controller/CurrentCursorCssClass.ts'
import { makeToolInputCore } from '../_support/controller/ToolInputCore.ts'
import { canvasCoordGetter, useGlobalInput } from '../_support/GlobalInputManager.ts'
import { useBrushCursor } from '../_support/renderers/BrushCursor.ts'
import { makePixelGridLineRenderer } from '../_support/renderers/PixelGridLineRenderer.ts'
import { makeBrushToolState } from '../_support/tools/BrushToolState.ts'
import { useSelectionCancelOnDocumentClick } from '../_support/tools/selection-helpers.ts'
import { makeLocalToolContexts } from '../Toolset.ts'
import {
  type BaseLocalToolContext,
  CanvasType,
  type LocalToolContexts,
  type LocalToolStates,
  type TileGridEditorToolHandlerArgs,
} from './_tile-grid-editor-types.ts'
import type { TileGridManager } from './data/TileGridManager.ts'
import { makeCurrentToolRenderer } from './renderers/CurrentToolRenderer.ts'
import { makeTileGridRenderer } from './renderers/TileGridRenderer.ts'
import { makeTileSheetRenderer } from './renderers/TileSheetRenderer.ts'
import { makeTileSheetSelectionRenderer } from './renderers/TileSheetSelectionRenderer.ts'
import { makeTileGridEditorState, type TileGridEditorState } from './TileGridEditorState.ts'
import { makeTileGridSelectionToolState } from './TileGridSelectionToolState.ts'
import { type TileGridToolset, useTileGridToolset } from './TileGridToolset.ts'
import { makeTileSheetWriter } from './TileSheetWriter.ts'

export type TileGridController = ReturnType<typeof useTileGridController>

export function useTileGridController(
  {
    id,
    tileGridManager,
    toolset = useTileGridToolset(),
    scale = toRef(useUIStore(), 'imgScale'),
    gridColor,
    gridDraw,
  }: BaseToolManagerSettings & {
    tileGridManager: TileGridManager,
    toolset?: TileGridToolset,
  },
) {

  const state = makeTileGridEditorState({
    id,
    tileGridManager,
    scale,
  })

  const gridCache = makePixelGridLineRenderer({
    scale,
    color: gridColor,
    width: tileGridManager.canvasWidth,
    height: tileGridManager.canvasHeight,
  })

  const gridRenderer = makeTileGridRenderer({
    state,
    gridCache,
  })

  const tileSheetWriter = makeTileSheetWriter({
    state,
    gridRenderer,
  })

  const localToolStates: LocalToolStates = {
    [Tool.BRUSH]: makeBrushToolState({ state }),
    [Tool.SELECT]: makeTileGridSelectionToolState({
      state,
      tileGridManager,
      tileSheetWriter,
      gridRenderer,
    }),
  }

  const localBase: BaseLocalToolContext = {
    state,
    gridRenderer,
    tileSheetWriter,
  }

  watch(gridCache.watchTarget, () => gridRenderer.queueRenderAll())

  const localToolContexts = makeLocalToolContexts(localBase, localToolStates) as LocalToolContexts

  const currentToolRenderer = makeCurrentToolRenderer({
    toolset: toolset,
    localToolContexts,
  })

  gridRenderer.setCurrentToolRenderer(currentToolRenderer)

  const tileSheetRenderer = makeTileSheetRenderer({
    state,
    localToolStates,
    gridCache,
  })

  const tileSheetSelectionRenderer = makeTileSheetSelectionRenderer({
    state,
    localToolStates,
    gridCache,
  })

  useSelectionCancelOnDocumentClick({ id, state, toolset, localToolStates })

  const uiStore = useUIStore()
  const brushCursor = useBrushCursor()
  watch(brushCursor.watchTarget, () => gridRenderer.queueRenderAll())

  watch(gridDraw, () => {
    gridRenderer.queueRenderAll()
    tileSheetRenderer.draw()
  })

  watch([
    tileGridManager.tileSize,
    () => uiStore.imgScale,
    () => uiStore.showTileIds,
    tileGridManager.tileGrid,
  ], () => {
    gridRenderer.resize()
    gridRenderer.queueRenderAll()
    tileSheetRenderer.resize()
  })

  const core = makeToolInputCore(state, toolset, localToolContexts)

  const currentCursorCssClass = ref<string | null>(null)
  const getCurrentCursorClass = makeGetCurrentCursorCssClass(toolset, localToolContexts)

  return defineToolManager<TileGridEditorToolHandlerArgs>()({
    id,
    state,
    currentCursorCssClass,
    gridRenderer,
    tileSheetRenderer,
    tileSheetSelectionRenderer,
    tileGridManager,
    tileSheetWriter,
    getInputHandlers(canvas, canvasType: CanvasType, tileId?: TileId) {
      return useGlobalInput({
        getCoordsFromEvent: canvasCoordGetter(canvas, state.scale),
        onMouseDown(x: number, y: number) {
          updatePointerState(state, tileGridManager, x, y, canvasType, tileId)
          state.dragStartTileId = state.mouseTileId
          core.pointerDown(x, y, canvasType, tileId)
          gridRenderer.queueRenderGrid()
        },
        onMouseMove(x: number, y: number) {
          updatePointerState(state, tileGridManager, x, y, canvasType, tileId)
          core.pointerMove(x, y, canvasType, tileId)
        },
        onMouseUp(x: number, y: number) {
          updatePointerState(state, tileGridManager, x, y, canvasType, tileId)
          core.pointerUp(x, y, canvasType, tileId)
          state.dragStartTileId = null
        },
        onMouseLeave() {
          clearPointerState(state)
          core.pointerLeave(canvasType, tileId)
          gridRenderer.queueRenderGrid()
        },
        onHoverStart() {
          currentCursorCssClass.value = getCurrentCursorClass()
        },
        onHoverEnd() {
          currentCursorCssClass.value = null
        },
      })
    },
  })
}

function updatePointerState(
  state: TileGridEditorState,
  tileGridManager: TileGridManager,
  x: number,
  y: number,
  canvasType: CanvasType,
  tileId?: TileId,
) {
  if (canvasType === CanvasType.GRID) {
    state.mouseGridX = x
    state.mouseGridY = y

    const d = tileGridManager.gridPixelToTile(x, y)
    const r = tileGridManager.gridPixelToTilePixel(x, y)

    if (d && r) {
      const { x: tx, y: ty } = r
      state.mouseTileId = d.tile.id
      state.mouseTilePixelX = tx
      state.mouseTilePixelY = ty
      state.hoverTileId = d.tile.id
      state.hoverTilePixelX = tx
      state.hoverTilePixelY = ty
    } else {
      state.mouseTileId = null
      state.mouseTilePixelX = null
      state.mouseTilePixelY = null
      state.hoverTileId = null
      state.hoverTilePixelX = null
      state.hoverTilePixelY = null
    }
    return
  }

  if (canvasType === CanvasType.TILE) {
    state.mouseTileId = tileId!
    state.mouseTilePixelX = x
    state.mouseTilePixelY = y

    state.mouseGridX = null
    state.mouseGridY = null

    state.hoverTileId = tileId!
    state.hoverTilePixelX = x
    state.hoverTilePixelY = y
    return
  }

  throw new Error('invalid canvas type: ' + canvasType)
}

function clearPointerState(state: TileGridEditorState) {
  state.mouseGridX = null
  state.mouseGridY = null
  state.mouseTileId = null
  state.mouseTilePixelX = null
  state.mouseTilePixelY = null
  state.hoverTileId = null
  state.hoverTilePixelX = null
  state.hoverTilePixelY = null
}
