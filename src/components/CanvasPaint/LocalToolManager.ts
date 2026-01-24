import type { ShallowRef } from 'vue'
import { type LocalToolContext, Tool } from './_canvas-editor-types.ts'
import type { TileGrid } from './data/TileGrid.ts'
import type { TileSheet } from './data/TileSheet.ts'
import { makeEditorState } from './EditorState.ts'
import { type GlobalToolManager, useGlobalToolManager } from './GlobalToolManager.ts'
import { makeTileGridRenderer } from './TileGridRenderer.ts'
import { makeTilesetToolState, type TilesetToolState } from './TilesetToolState.ts'
import { makeTileSheetWriter, type TileSheetWriter } from './TileSheetWriter.ts'

export type LocalToolManager = ReturnType<typeof makeLocalToolManager>

export function makeLocalToolManager(
  {
    tileSheet,
    tileGrid,
    tileSheetWriter,
    tilesetToolState,
    global = useGlobalToolManager(),
  }: {
    tileSheet: ShallowRef<TileSheet>,
    tileGrid: TileGrid,
    tileSheetWriter?: TileSheetWriter,
    tilesetToolState?: TilesetToolState,
    global?: GlobalToolManager
  },
) {
  const state = makeEditorState(tileSheet)
  const gridRenderer = makeTileGridRenderer({
    state,
    tileGrid,
    toolContext: global.toolContext,
    globalToolManager: global,
    localToolContext: () => local,
  })

  tilesetToolState ??= makeTilesetToolState(tileGrid)
  tileSheetWriter ??= makeTileSheetWriter({
    state,
    tileGrid,
    gridRenderer,
  })

  const local: LocalToolContext = {
    state,
    gridRenderer,
    tilesetToolState,
    tileSheetWriter,
  }

  function setMouseOverTile(gx: number, gy: number) {
    const d = tileGrid.gridPixelToTile(gx, gy)
    if (!d) return

    state.mouseOverTileId = d.tile.id
    const { x, y } = tileGrid.gridPixelToTilePixel(gx, gy)
    state.mouseOverTilePixelX = x
    state.mouseOverTilePixelY = y
  }

  function clearMouseOverTile() {
    state.mouseOverTileId = null
    state.mouseOverTilePixelX = null
    state.mouseOverTilePixelY = null
  }

  return {
    state,
    gridRenderer,
    tilesetToolState,
    tileGrid,
    onGlobalToolChanging(oldTool: Tool, newTool: Tool) {
      global.tools[oldTool]?.onGlobalToolChanging?.(local, oldTool, newTool)
    },

    onMouseDown(x: number, y: number) {
      setMouseOverTile(x, y)

      global.setActiveLocal(local)

      state.mouseDownX = x
      state.mouseDownY = y
      state.isDragging = false

      global.tools[global.currentTool]?.onMouseDown?.(local, x, y)
      gridRenderer.queueRender()
    },

    onMouseMove(x: number, y: number) {
      state.mouseOverTileId = null

      setMouseOverTile(x, y)

      state.cursorX = x
      state.cursorY = y

      if (state.mouseDownX !== null && state.mouseDownY !== null) {
        const dx = x - state.mouseDownX
        const dy = y - state.mouseDownY

        if (!state.isDragging &&
          (Math.abs(dx) > state.dragThreshold || Math.abs(dy) > state.dragThreshold)) {
          state.isDragging = true
          global.tools[global.currentTool]?.onDragStart?.(local, state.mouseDownX, state.mouseDownY)
        } else {
          global.tools[global.currentTool]?.onDragMove?.(local, x, y)
        }

      } else {
        global.tools[global.currentTool]?.onMouseMove?.(local, x, y)
      }

      state.lastX = x
      state.lastY = y
    },

    onMouseUp(x: number, y: number) {
      setMouseOverTile(x, y)

      if (state.isDragging) {
        global.tools[global.currentTool]?.onDragEnd?.(local, x, y)
      } else {
        global.tools[global.currentTool]?.onClick?.(local, x, y)
      }

      state.mouseDownX = null
      state.mouseDownY = null
      state.isDragging = false
    },

    onMouseLeave() {
      clearMouseOverTile()
      state.mouseOverTileId = null
      global.tools[global.currentTool]?.onMouseLeave?.(local)
      gridRenderer.queueRender()
    },
  }
}
