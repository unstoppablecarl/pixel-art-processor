import type { RectBounds } from '../../lib/util/data/Bounds.ts'
import type { AxialEdgeWangTileManager } from '../../lib/wang-tiles/AxialEdgeWangTileManager.ts'
import type { WangTile } from '../../lib/wang-tiles/WangTileset.ts'
import { type LocalToolContext, type TilesetImageRefs, Tool } from './_canvas-editor-types.ts'
import { makeEditorState } from './EditorState.ts'
import { type GlobalToolManager, useGlobalToolManager } from './GlobalToolManager.ts'
import { makeTileGridRenderer } from './TileGridRenderer.ts'
import { makeTilesetToolState, type TilesetToolState } from './TilesetToolState.ts'
import { makeTilesetWriter, type TilesetWriter } from './TIlesetWriter.ts'

export type LocalToolManager = ReturnType<typeof makeLocalToolManager>

export function makeLocalToolManager(
  {
    bounds,
    tilesetImageRefs,
    tilesetManager,
    tilesetWriter,
    tilesetToolState,
    onSyncTile,
    global = useGlobalToolManager(),
  }: {
    bounds?: RectBounds,
    tilesetImageRefs: TilesetImageRefs,
    tilesetManager: AxialEdgeWangTileManager,
    tilesetWriter?: TilesetWriter,
    tilesetToolState?: TilesetToolState,
    onSyncTile?: (tile: WangTile<number>, imageData: ImageData) => void,
    global?: GlobalToolManager
  },
) {
  const state = makeEditorState(tilesetImageRefs)
  const gridRenderer = makeTileGridRenderer({
    state,
    tilesetManager,
    toolContext: global.toolContext,
    gridScreenOverlayDraw: (ctx) => {
      global.currentToolHandler?.screenOverlayDraw?.(local, ctx)
      ctx.fillStyle = '#00ff00'
      ctx.fillRect(20, 20, 30, 30)
    },
    gridPixelOverlayDraw: (ctx) => {
      tilesetManager.drawGridEdges(ctx)
      global.currentToolHandler?.pixelOverlayDraw?.(local, ctx)
    },
  })

  tilesetToolState ??= makeTilesetToolState(tilesetManager)
  tilesetWriter ??= makeTilesetWriter({
    state,
    tilesetImageRefs,
    tilesetManager,
    gridRenderer,
    onSyncTile,
  })

  const local: LocalToolContext = {
    state,
    gridRenderer,
    tilesetToolState,
    tilesetImageRefs,
    tilesetWriter,
  }

  function setMouseOverTile(gx: number, gy: number) {
    const d = tilesetManager.gridPixelToTile(gx, gy)
    if (!d) return

    state.mouseOverTileId = d.tile.id
    const { x, y } = state.gridPixelToTilePixel(gx, gy)
    state.mouseOverTilePixelX = x
    state.mouseOverTilePixelY = y
  }

  function clearMouseOverTile() {
    state.mouseOverTileId = null
    state.mouseOverTilePixelX = null
    state.mouseOverTilePixelX = null
  }

  return {
    state,
    gridRenderer,
    tilesetToolState,
    onGlobalToolChanging(oldTool: Tool, newTool: Tool) {
      global.tools[oldTool]?.onGlobalToolChanging?.(local, oldTool, newTool)
    },

    onMouseDown(x: number, y: number) {
      setMouseOverTile(x, y)
      // const { x, y } = state.tilePixelToGridPixel(gx, gy)

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

      console.log('onMouseMove', x, y)

      // const { x, y } = state.gridPixelToTilePixel(gx, gy)
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
      // const { x, y } = state.tilePixelToGridPixel(gx, gy)

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
