import { computed, ref, toRef, watch } from 'vue'
import { type CanvasEditToolStore, useCanvasEditToolStore } from '../../../lib/store/canvas-edit-tool-store.ts'
import { useUIStore } from '../../../lib/store/ui-store.ts'
import type { TileId } from '../../../lib/wang-tiles/WangTileset.ts'
import { type BaseToolManagerSettings, defineToolManager } from '../_core-editor-types.ts'
import { makeGetCurrentCursorCssClass } from '../_support/controller/CurrentCursorCssClass.ts'
import { makeToolInputCore } from '../_support/controller/ToolInputCore.ts'
import { canvasCoordGetter, useGlobalInput } from '../_support/GlobalInputManager.ts'
import { useBrushCursor } from '../_support/renderers/BrushCursor.ts'
import { makePixelGridLineRenderer } from '../_support/renderers/PixelGridLineRenderer.ts'
import { useSelectionCancelOnDocumentClick } from '../_support/tools/selection-helpers.ts'
import { CanvasType, type TileGridEditorToolHandlerArgs } from './_tile-grid-editor-types.ts'
import { makeTileGridGeometry, type TileGridGeometry } from './data/TileGridGeometry.ts'
import type { TileGridManager } from './data/TileGridManager.ts'
import { makeTileSheetWriter } from './data/TileSheetWriter.ts'
import { makeCurrentToolRenderer } from './renderers/CurrentToolRenderer.ts'
import { makeTileGridEdgeColorRenderer } from './renderers/TileGridEdgeColorRenderer.ts'
import { makeTileGridRenderer } from './renderers/TileGridRenderer.ts'
import { makeTileSheetRenderer } from './renderers/TileSheetRenderer.ts'
import { makeTileSheetSelectionRenderer } from './renderers/TileSheetSelectionRenderer.ts'
import { makeTileGridEditorState, type TileGridEditorState } from './TileGridEditorState.ts'
import { makeTileGridToolset } from './TileGridToolset.ts'

export type TileGridController = ReturnType<typeof useTileGridController>

export function useTileGridController(
  {
    id,
    tileGridManager,
    scale = toRef(useUIStore(), 'imgScale'),
    gridColor,
    gridDraw,
    store = useCanvasEditToolStore(),
  }: BaseToolManagerSettings & {
    tileGridManager: TileGridManager,
    store?: CanvasEditToolStore
  },
) {

  const tileGridGeometry = computed(() => makeTileGridGeometry(
    tileGridManager.tileGrid.value,
    tileGridManager.tileSheet.value,
    tileGridManager.tileSize.value,
  ))

  const tileGridEdgeColorRenderer = makeTileGridEdgeColorRenderer(
    tileGridManager.tileGrid,
    tileGridManager.tileSize,
  )

  const state = makeTileGridEditorState({
    id,
    tileGridManager,
    tileGridGeometry,
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
    tileGridEdgeColorRenderer,
  })

  const tileSheetWriter = makeTileSheetWriter({
    state,
    gridRenderer,
    store,
  })

  watch(gridCache.watchTarget, () => gridRenderer.queueRenderAll())

  const toolset = makeTileGridToolset({
    state,
    tileSheetWriter,
    gridRenderer,
  })

  const currentToolRenderer = makeCurrentToolRenderer(toolset)

  gridRenderer.setCurrentToolRenderer(currentToolRenderer)

  const tileSheetRenderer = makeTileSheetRenderer({
    state,
    toolset,
    gridCache,
    tileGridEdgeColorRenderer,
  })

  const tileSheetSelectionRenderer = makeTileSheetSelectionRenderer({
    state,
    toolset,
    gridCache,
  })

  useSelectionCancelOnDocumentClick({ id, state, toolset, localToolStates: toolset.localToolStates })

  const uiStore = useUIStore()
  const brushCursor = useBrushCursor()
  watch(brushCursor.watchTarget, () => gridRenderer.queueRenderAll())

  watch(gridDraw, () => {
    gridRenderer.queueRenderAll()
    tileSheetRenderer.draw()
  })

  watch([
    tileGridManager.tileSize,
    scale,
    () => uiStore.showTileIds,
    tileGridManager.tileGrid,
  ], () => {
    gridRenderer.resize()
    gridRenderer.queueRenderAll()
    tileSheetRenderer.resize()
  })

  const core = makeToolInputCore(state, toolset)

  const currentCursorCssClass = ref<string | null>(null)
  const getCurrentCursorClass = makeGetCurrentCursorCssClass(toolset)

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
        getCoordsFromEvent: canvasCoordGetter(canvas, scale),
        onMouseDown(x: number, y: number) {
          updatePointerState(state, tileGridGeometry.value, x, y, canvasType, tileId)
          state.dragStartTileId = state.mouseTileId
          core.pointerDown(x, y, canvasType, tileId)
          gridRenderer.queueRenderGrid()
        },
        onMouseMove(x: number, y: number) {
          updatePointerState(state, tileGridGeometry.value, x, y, canvasType, tileId)
          core.pointerMove(x, y, canvasType, tileId)
        },
        onMouseUp(x: number, y: number) {
          updatePointerState(state, tileGridGeometry.value, x, y, canvasType, tileId)
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
  tileGridGeometry: TileGridGeometry,
  x: number,
  y: number,
  canvasType: CanvasType,
  tileId?: TileId,
) {
  if (canvasType === CanvasType.GRID) {
    state.mouseGridX = x
    state.mouseGridY = y

    const d = tileGridGeometry.gridPixelToGridTile(x, y)
    const r = tileGridGeometry.gridPixelToTilePixel(x, y)

    if (d && r) {
      const { tx, ty } = r
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
