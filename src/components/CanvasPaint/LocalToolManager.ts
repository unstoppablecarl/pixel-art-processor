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
  const gridRenderer = makeTileGridRenderer(state, global.toolContext, tilesetManager)

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

  return {
    state,
    gridRenderer,
    tilesetToolState,
    onGlobalToolChanging(oldTool: Tool, newTool: Tool) {
      global.tools[oldTool]?.onGlobalToolChanging?.(local, oldTool, newTool)
    },

    onMouseDown(gx: number, gy: number) {
      const { x, y } = state.tilePixelToGridPixel(gx, gy)

      global.setActiveLocal(local)

      state.mouseDownX = x
      state.mouseDownY = y
      state.isDragging = false

      global.tools[global.currentTool]?.onMouseDown?.(local, x, y)
      gridRenderer.queueRender()
    },

    onMouseMove(gx: number, gy: number) {
      const { x, y } = state.gridPixelToTilePixel(gx, gy)
      state.cursorX = x
      state.cursorY = y

      if (state.mouseDownX !== null && state.mouseDownY !== null) {
        const dx = x - state.mouseDownX
        const dy = y - state.mouseDownY

        if (!state.isDragging &&
          (Math.abs(dx) > state.dragThreshold || Math.abs(dy) > state.dragThreshold)) {
          state.isDragging = true
          global.tools[global.currentTool]?.onDragStart?.(local, state.mouseDownX, state.mouseDownY)
        }

        if (state.isDragging) {
          global.tools[global.currentTool]?.onDragMove?.(local, x, y)
        } else {
          global.tools[global.currentTool]?.onMouseMove?.(local, x, y)
        }
      }
      global.tools[global.currentTool]?.onMouseMove?.(local, x, y)

      state.lastX = x
      state.lastY = y
    },

    onMouseUp(gx: number, gy: number) {
      const { x, y } = state.tilePixelToGridPixel(gx, gy)

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
      global.tools[global.currentTool]?.onMouseLeave?.(local)
      gridRenderer.queueRender()
    },

    currentToolPixelOverlayDraw(ctx: CanvasRenderingContext2D) {
      // if (global.activeLocal !== local) return
      global.currentToolHandler?.pixelOverlayDraw?.(local, ctx)
    },

    currentToolScreenOverlayDraw(ctx: CanvasRenderingContext2D) {
      // if (global.activeLocal !== local) return
      global.currentToolHandler?.screenOverlayDraw?.(local, ctx)
    },
  }
}
