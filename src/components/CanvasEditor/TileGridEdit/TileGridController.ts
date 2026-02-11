import { computed, toRef, watch } from 'vue'
import { type CanvasEditToolStore, useCanvasEditToolStore } from '../../../lib/store/canvas-edit-tool-store.ts'
import { useUIStore } from '../../../lib/store/ui-store.ts'
import type { TileId } from '../../../lib/wang-tiles/WangTileset.ts'
import { type BaseToolManagerSettings, defineToolController } from '../_core/_core-editor-types.ts'
import { makeToolInputCore } from '../_core/controller/ToolInputCore.ts'
import { makeBaseInputHandlers } from '../_core/GlobalInputManager.ts'
import { useBrushCursor } from '../_core/renderers/BrushCursor.ts'
import { makePixelGridLineRenderer } from '../_core/renderers/PixelGridLineRenderer.ts'
import { CanvasType, type TileGridEditorToolHandlerArgs } from './_tile-grid-editor-types.ts'
import { makeTileGridGeometry, type TileGridGeometry } from './data/TileGridGeometry.ts'
import type { TileGridManager } from './data/TileGridManager.ts'
import { makeTileSheetWriter } from './data/TileSheetWriter.ts'
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

  gridRenderer.setToolset(toolset)

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

  const input = makeToolInputCore(state, toolset)

  return defineToolController<TileGridEditorToolHandlerArgs>()({
    id,
    state,
    gridRenderer,
    tileSheetRenderer,
    tileSheetSelectionRenderer,
    tileGridManager,
    tileSheetWriter,
    getInputHandlers(canvas, canvasType: CanvasType, tileId?: TileId) {
      return makeBaseInputHandlers({
        toolset,
        canvas,
        scale,
        input: {
          onMouseDown(x: number, y: number) {
            updatePointerState(state, tileGridGeometry.value, x, y, canvasType, tileId)
            state.dragStartTileId = state.mouseTileId
            input.pointerDown(x, y, canvasType, tileId)
          },
          onMouseMove(x: number, y: number) {
            updatePointerState(state, tileGridGeometry.value, x, y, canvasType, tileId)
            input.pointerMove(x, y, canvasType, tileId)
          },
          onMouseUp(x: number, y: number) {
            updatePointerState(state, tileGridGeometry.value, x, y, canvasType, tileId)
            input.pointerUp(x, y, canvasType, tileId)
            state.dragStartTileId = null
          },
          onMouseLeave() {
            clearPointerState(state)
            input.pointerLeave(canvasType, tileId)
          },
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
