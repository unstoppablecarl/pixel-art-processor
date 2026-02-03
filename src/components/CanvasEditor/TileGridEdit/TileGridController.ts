import { toRef, watch, watchEffect } from 'vue'
import { useUIStore } from '../../../lib/store/ui-store.ts'
import { useDocumentClick } from '../../../lib/util/vue-util.ts'
import type { TileId } from '../../../lib/wang-tiles/WangTileset.ts'
import {
  type BaseToolManagerSettings,
  DATA_ATTR_EXCLUDE_SELECT_CANCEL_CLICK,
  DATA_LOCAL_TOOL_ID,
  defineToolManager,
  Tool,
} from '../_core-editor-types.ts'
import { useBrushCursor } from '../_support/BrushCursor.ts'
import { makeBrushToolState } from '../_support/BrushToolState.ts'
import { makePixelGridLineRenderer } from '../_support/PixelGridLineRenderer.ts'
import { makeLocalToolContexts } from '../Toolset.ts'
import {
  type BaseLocalToolContext,
  CanvasType,
  type LocalToolContext,
  type LocalToolContexts,
  type LocalToolStates,
  type TileGridEditorToolHandlerArgs,
} from './_tile-grid-editor-types.ts'
import type { TileGridManager } from './data/TileGridManager.ts'
import { makeCurrentToolRenderer } from './renderers/CurrentToolRenderer.ts'
import { makeTileGridRenderer } from './renderers/TileGridRenderer.ts'
import { makeTileSheetRenderer } from './renderers/TileSheetRenderer.ts'
import { makeTileSheetSelectionRenderer } from './renderers/TileSheetSelectionRenderer.ts'
import { makeTileGridEditorState } from './TileGridEditorState.ts'
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
  }: BaseToolManagerSettings & {
    tileGridManager: TileGridManager,
    toolset?: TileGridToolset,
  },
) {

  const state = makeTileGridEditorState({
    tileGridManager,
    gridColor,
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
    globalToolContext: toolset.toolContext,
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

  function prepareMouseEventState(x: number, y: number, canvasType: CanvasType, tileId?: TileId) {
    if (canvasType === CanvasType.GRID) {
      state.mouseGridX = x
      state.mouseGridY = y

      const d = tileGridManager.gridPixelToTile(x, y)
      const r = tileGridManager.gridPixelToTilePixel(x, y)
      if (d && r) {
        const { x: tx, y: ty } = r
        state.hoverTileId = d.tile.id
        state.hoverTilePixelX = tx
        state.hoverTilePixelY = ty
      } else {
        state.mouseTileId = null
        state.mouseTilePixelX = null
        state.mouseTilePixelY = null
      }
      return
    } else if (canvasType === CanvasType.TILE) {
      state.mouseTileId = tileId!
      state.mouseTilePixelX = x
      state.mouseTilePixelY = y

      state.mouseGridX = null
      state.mouseGridY = null

      state.hoverTileId = tileId!
      state.hoverTilePixelX = x
      state.hoverTilePixelY = y
      return
    } else {
      throw new Error('invalid canvas type: ' + canvasType)
    }
  }

  useDocumentClick((t) => {
    if (toolset.currentTool !== Tool.SELECT) return
    if (t.closest(`[${DATA_ATTR_EXCLUDE_SELECT_CANCEL_CLICK}]`)) return
    if (t.getAttribute(DATA_LOCAL_TOOL_ID) === id) return

    localToolStates[Tool.SELECT].clearSelection()
  })

  const uiStore = useUIStore()
  const brushCursor = useBrushCursor()
  watch(brushCursor.watchTarget, () => gridRenderer.queueRenderAll())

  watchEffect(() => {
    state.tileSize = tileGridManager.tileSize.value
    state.scale = uiStore.imgScale
    state.gridTilesWidth = tileGridManager.tileGrid.value.width
    state.gridTilesHeight = tileGridManager.tileGrid.value.height
    state.drawTileIds = uiStore.showTileIds
    gridRenderer.resize()
    gridRenderer.queueRenderAll()
    tileSheetRenderer.resize()
  })

  return defineToolManager<TileGridEditorToolHandlerArgs>()({
    id,
    state,
    gridRenderer,
    tileSheetRenderer,
    tileSheetSelectionRenderer,
    tileGridManager,
    tileSheetWriter,
    onGlobalToolChanging(newTool, prevTool) {
      const local = localToolContexts[newTool] as LocalToolContext<any>
      if (prevTool) {
        toolset.tools[prevTool]?.onGlobalToolChanging?.(local, newTool, prevTool)
      }
    },
    onMouseDown(x: number, y: number, canvasType: CanvasType, tileId?: TileId): void {
      prepareMouseEventState(x, y, canvasType, tileId)
      const local = localToolContexts[toolset.currentTool] as LocalToolContext<any>

      toolset.setActiveLocal(local)

      state.mouseDownX = x
      state.mouseDownY = y
      state.isDragging = false

      toolset.tools[toolset.currentTool]?.onMouseDown?.(local, x, y, canvasType, tileId)
      gridRenderer.queueRenderGrid()
    },
    onMouseMove(x: number, y: number, canvasType: CanvasType, tileId?: TileId) {
      prepareMouseEventState(x, y, canvasType, tileId)
      const local = localToolContexts[toolset.currentTool] as LocalToolContext<any>

      if (state.mouseDownX !== null && state.mouseDownY !== null) {
        const dx = x - state.mouseDownX
        const dy = y - state.mouseDownY

        if (!state.isDragging &&
          (Math.abs(dx) > state.dragThreshold || Math.abs(dy) > state.dragThreshold)) {

          state.isDragging = true
          state.dragStartTileId = state.mouseTileId
          state.mouseDragStartX = state.mouseDownX
          state.mouseDragStartY = state.mouseDownY

          toolset.tools[toolset.currentTool]?.onDragStart?.(
            local,
            state.mouseDownX,
            state.mouseDownY,
            canvasType,
            tileId,
          )
        } else {
          toolset.tools[toolset.currentTool]?.onDragMove?.(local, x, y, canvasType, tileId)
        }

      } else {
        toolset.tools[toolset.currentTool]?.onMouseMove?.(local, x, y, canvasType, tileId)
      }

      state.mouseLastX = x
      state.mouseLastY = y
    },

    onMouseUp(x: number, y: number, canvasType: CanvasType, tileId?: TileId) {
      prepareMouseEventState(x, y, canvasType, tileId)
      const local = localToolContexts[toolset.currentTool] as LocalToolContext<any>

      if (state.isDragging) {
        toolset.tools[toolset.currentTool]?.onDragEnd?.(local, x, y, canvasType, tileId)
        state.dragStartTileId = null
        state.mouseDragStartX = null
        state.mouseDragStartY = null
      } else {
        toolset.tools[toolset.currentTool]?.onClick?.(local, x, y, canvasType, tileId)
      }

      state.mouseDownX = null
      state.mouseDownY = null
      state.isDragging = false
    },
    onMouseLeave(canvasType: CanvasType, tileId?: TileId) {
      const local = localToolContexts[toolset.currentTool] as LocalToolContext<any>

      state.mouseGridX = null
      state.mouseGridY = null

      state.mouseTileId = null
      state.mouseTilePixelX = null
      state.mouseTilePixelY = null

      state.hoverTileId = null
      state.hoverTilePixelX = null
      state.hoverTilePixelY = null

      toolset.tools[toolset.currentTool]?.onMouseLeave?.(local, canvasType, tileId)
      gridRenderer.queueRenderGrid()
    },
  })
}
