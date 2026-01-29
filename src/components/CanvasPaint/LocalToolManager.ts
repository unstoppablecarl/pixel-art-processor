import { watch, watchEffect } from 'vue'
import { useCanvasPaintStore } from '../../lib/store/canvas-paint-store.ts'
import { useUIStore } from '../../lib/store/ui-store.ts'
import { useDocumentClick } from '../../lib/util/vue-util.ts'
import type { TileId } from '../../lib/wang-tiles/WangTileset.ts'
import {
  type BaseLocalToolContext,
  CanvasType,
  DATA_ATTR_EXCLUDE_SELECT_CANCEL_CLICK,
  DATA_LOCAL_TOOL_ID,
  type LocalToolContext,
  type LocalToolContexts,
  type LocalToolStates,
  Tool,
} from './_canvas-editor-types.ts'
import type { TileGridManager } from './data/TileGridManager.ts'
import { makeEditorState } from './EditorState.ts'
import { type GlobalToolManager, useGlobalToolManager } from './GlobalToolManager.ts'
import { makeCurrentToolRenderer } from './renderers/CurrentToolRenderer.ts'
import { makeTileGridRenderer } from './renderers/TileGridRenderer.ts'
import { makeTileSheetRenderer } from './renderers/TileSheetRenderer.ts'
import { makeTileSheetSelectionRenderer } from './renderers/TileSheetSelectionRenderer.ts'
import { makeSelectionLocalToolState } from './SelectionLocalToolState.ts'
import { makeTileSheetWriter } from './TileSheetWriter.ts'

export type LocalToolManager = ReturnType<typeof useLocalToolManager>

export function useLocalToolManager(
  {
    id,
    tileGridManager,
    global = useGlobalToolManager(),
  }: {
    id: string,
    tileGridManager: TileGridManager,
    global?: GlobalToolManager
  },
) {

  const state = makeEditorState(tileGridManager)
  const gridRenderer = makeTileGridRenderer({
    state,
    toolContext: global.toolContext,
  })

  const tileSheetWriter = makeTileSheetWriter({
    state,
    gridRenderer,
    globalToolContext: global.toolContext,
  })

  const localToolStates: LocalToolStates = {
    [Tool.BRUSH]: {},
    [Tool.SELECT]: makeSelectionLocalToolState({
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

  const localToolContexts = Object.fromEntries(
    Object.entries(localToolStates).map(([key, val]) => {
      return [key as Tool, { ...localBase, toolState: localToolStates[key as Tool] }]
    }),
  ) as LocalToolContexts

  const currentToolRenderer = makeCurrentToolRenderer({
    globalToolManager: global,
    localToolContexts,
  })

  gridRenderer.setCurrentToolRenderer(currentToolRenderer)

  const tileSheetRenderer = makeTileSheetRenderer({
    state,
    localToolStates,
    gridCache: gridRenderer.gridCache,
  })

  const tileSheetSelectionRenderer = makeTileSheetSelectionRenderer({
    state,
    localToolStates,
    gridCache: gridRenderer.gridCache,
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
    if (global.currentTool !== Tool.SELECT) return
    if (t.closest(`[${DATA_ATTR_EXCLUDE_SELECT_CANCEL_CLICK}]`)) return
    if (t.getAttribute(DATA_LOCAL_TOOL_ID) === id) return

    localToolStates[Tool.SELECT].clearSelection()
  })

  const uiStore = useUIStore()
  const canvasStore = useCanvasPaintStore()

  watch(() => canvasStore.brushSize, () => {
    gridRenderer.queueRenderAll()
  })

  watchEffect(() => {
    state.tileSize = tileGridManager.tileSize.value
    state.scale = uiStore.imgScale
    state.gridTilesWidth = tileGridManager.tileGrid.value.width
    state.gridTilesHeight = tileGridManager.tileGrid.value.height
    gridRenderer.resize()
    gridRenderer.queueRenderAll()
    tileSheetRenderer.resize()
  })

  return {
    id,
    state,
    gridRenderer,
    tileSheetRenderer,
    tileSheetSelectionRenderer,
    tileGridManager,
    tileSheetWriter,
    onGlobalToolChanging(oldTool: Tool, newTool: Tool) {
      const local = localToolContexts[newTool] as LocalToolContext<any>
      global.tools[oldTool]?.onGlobalToolChanging?.(local, oldTool, newTool)
    },

    onMouseDown(x: number, y: number, canvasType: CanvasType, tileId?: TileId): void {
      prepareMouseEventState(x, y, canvasType, tileId)
      const local = localToolContexts[global.currentTool] as LocalToolContext<any>

      global.setActiveLocal(local)

      state.mouseDownX = x
      state.mouseDownY = y
      state.isDragging = false

      global.tools[global.currentTool]?.onMouseDown?.(local, x, y, canvasType, tileId)
      gridRenderer.queueRenderGrid()
    },
    onMouseMove(x: number, y: number, canvasType: CanvasType, tileId?: TileId) {
      prepareMouseEventState(x, y, canvasType, tileId)
      const local = localToolContexts[global.currentTool] as LocalToolContext<any>

      if (state.mouseDownX !== null && state.mouseDownY !== null) {
        const dx = x - state.mouseDownX
        const dy = y - state.mouseDownY

        if (!state.isDragging &&
          (Math.abs(dx) > state.dragThreshold || Math.abs(dy) > state.dragThreshold)) {

          state.isDragging = true
          state.dragStartTileId = state.mouseTileId
          state.mouseDragStartX = state.mouseDownX
          state.mouseDragStartY = state.mouseDownY

          global.tools[global.currentTool]?.onDragStart?.(
            local,
            state.mouseDownX,
            state.mouseDownY,
            canvasType,
            tileId,
          )
        } else {
          global.tools[global.currentTool]?.onDragMove?.(local, x, y, canvasType, tileId)
        }

      } else {
        global.tools[global.currentTool]?.onMouseMove?.(local, x, y, canvasType, tileId)
      }

      state.mouseLastX = x
      state.mouseLastY = y
    },

    onMouseUp(x: number, y: number, canvasType: CanvasType, tileId?: TileId) {
      prepareMouseEventState(x, y, canvasType, tileId)
      const local = localToolContexts[global.currentTool] as LocalToolContext<any>

      if (state.isDragging) {
        global.tools[global.currentTool]?.onDragEnd?.(local, x, y, canvasType, tileId)
        state.dragStartTileId = null
        state.mouseDragStartX = null
        state.mouseDragStartY = null
      } else {
        global.tools[global.currentTool]?.onClick?.(local, x, y, canvasType, tileId)
      }

      state.mouseDownX = null
      state.mouseDownY = null
      state.isDragging = false
    },
    onMouseLeave(canvasType: CanvasType, tileId?: TileId) {
      const local = localToolContexts[global.currentTool] as LocalToolContext<any>

      state.mouseGridX = null
      state.mouseGridY = null

      state.mouseTileId = null
      state.mouseTilePixelX = null
      state.mouseTilePixelY = null

      state.hoverTileId = null
      state.hoverTilePixelX = null
      state.hoverTilePixelY = null

      global.tools[global.currentTool]?.onMouseLeave?.(local, canvasType, tileId)
      gridRenderer.queueRenderGrid()
    },
  }
}
