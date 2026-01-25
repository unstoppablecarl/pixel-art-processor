import type { ShallowRef } from 'vue'
import type { Position } from '../../../lib/pipeline/_types.ts'
import type { TileId } from '../../../lib/wang-tiles/WangTileset.ts'
import { CanvasType } from '../_canvas-editor-types.ts'
import type { LocalToolManager } from '../LocalToolManager.ts'

export function createTileMouseHandlers(
  tools: LocalToolManager,
  canvas: Readonly<ShallowRef<HTMLCanvasElement | null>>,
  tileId: TileId,
) {
  return createMouseHandlers(tools, canvas, CanvasType.TILE, tileId)
}

export function createGridMouseHandlers(
  tools: LocalToolManager,
  canvas: Readonly<ShallowRef<HTMLCanvasElement | null>>,
) {
  return createMouseHandlers(tools, canvas, CanvasType.GRID)
}

function createMouseHandlers(
  tools: LocalToolManager,
  canvas: Readonly<ShallowRef<HTMLCanvasElement | null>>,
  canvasType: CanvasType,
  tileId?: TileId,
) {
  const state = tools.state

  function getCanvasCoords(e: MouseEvent): Position {
    const rect = canvas.value!.getBoundingClientRect()
    return {
      x: Math.floor((e.clientX - rect.left) / state.scale),
      y: Math.floor((e.clientY - rect.top) / state.scale),
    }
  }

  return {
    handleMouseDown: (e: MouseEvent): void => {
      const { x, y } = getCanvasCoords(e)
      tools.onMouseDown(x, y, canvasType, tileId)
    },
    handleMouseMove: (e: MouseEvent): void => {
      const { x, y } = getCanvasCoords(e)
      tools.onMouseMove(x, y, canvasType, tileId)
    },
    handleMouseUp: (e: MouseEvent): void => {
      const { x, y } = getCanvasCoords(e)
      tools.onMouseUp(x, y, canvasType, tileId)
    },
    handleMouseLeave: (): void =>
      tools.onMouseLeave(canvasType, tileId),
  }
}
