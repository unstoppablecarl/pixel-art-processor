import type { TileId } from '../../lib/wang-tiles/WangTileset.ts'
import { CanvasType, type LocalToolContext, Tool } from './_canvas-editor-types.ts'
import type { TileGridManager } from './data/TileGridManager.ts'
import { makeEditorState } from './EditorState.ts'
import { type GlobalToolManager, useGlobalToolManager } from './GlobalToolManager.ts'
import { makeTileSheetRenderer } from './renderers/TileSheetRenderer.ts'
import { makeTileGridRenderer } from './TileGridRenderer.ts'
import { makeTilesetToolState, type TilesetToolState } from './TilesetToolState.ts'
import { makeTileSheetWriter, type TileSheetWriter } from './TileSheetWriter.ts'

export type LocalToolManager = ReturnType<typeof makeLocalToolManager>

export function makeLocalToolManager(
  {
    tileGridManager,
    tileSheetWriter,
    tilesetToolState,
    global = useGlobalToolManager(),
  }: {
    tileGridManager: TileGridManager,
    tileSheetWriter?: TileSheetWriter,
    tilesetToolState?: TilesetToolState,
    global?: GlobalToolManager
  },
) {

  const state = makeEditorState(tileGridManager)
  const gridRenderer = makeTileGridRenderer({
    state,
    toolContext: global.toolContext,
    globalToolManager: global,
    localToolContext: () => local,
  })

  tileSheetWriter ??= makeTileSheetWriter({
    state,
    gridRenderer,
    globalToolContext: global.toolContext,
  })

  tilesetToolState ??= makeTilesetToolState({
    state,
    tileGridManager,
    tileSheetWriter,
    gridRenderer,
  })

  const tileSheetRenderer = makeTileSheetRenderer({ state, tilesetToolState })

  const local: LocalToolContext = {
    state,
    gridRenderer,
    tilesetToolState,
    tileSheetWriter,
  }

  function prepareMouseEventState(x: number, y: number, canvasType: CanvasType, tileId?: TileId) {
    if (canvasType === CanvasType.GRID) {
      state.mouseGridX = x
      state.mouseGridY = y

      const d = tileGridManager.gridPixelToTile(x, y)
      if (d) {
        const { x: tx, y: ty } = tileGridManager.gridPixelToTilePixel(x, y)
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

  return {
    state,
    gridRenderer,
    tileSheetRenderer,
    tilesetToolState,
    tileGridManager,
    onGlobalToolChanging(oldTool: Tool, newTool: Tool) {
      global.tools[oldTool]?.onGlobalToolChanging?.(local, oldTool, newTool)
    },

    onMouseDown(x: number, y: number, canvasType: CanvasType, tileId?: TileId): void {
      prepareMouseEventState(x, y, canvasType, tileId)

      global.setActiveLocal(local)

      state.mouseDownX = x
      state.mouseDownY = y
      state.isDragging = false

      global.tools[global.currentTool]?.onMouseDown?.(local, x, y, canvasType, tileId)
      gridRenderer.queueRenderGrid()
    },
    onMouseMove(x: number, y: number, canvasType: CanvasType, tileId?: TileId) {
      prepareMouseEventState(x, y, canvasType, tileId)

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
