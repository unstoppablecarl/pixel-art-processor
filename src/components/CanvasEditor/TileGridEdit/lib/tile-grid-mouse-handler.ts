import type { ShallowRef } from 'vue'
import type { TileId } from '../../../../lib/wang-tiles/WangTileset.ts'
import type { BaseToolMouseHandlers } from '../../_core-editor-types.ts'
import { getCanvasCoords } from '../../_support/misc.ts'
import { CanvasType } from '../_tile-grid-editor-types.ts'
import type { TileGridController } from '../TileGridController.ts'

export function createTileMouseHandlers(
  tools: TileGridController,
  canvas: Readonly<ShallowRef<HTMLCanvasElement | null>>,
  tileId: TileId,
) {
  return createTileGridMouseHandlers(tools, canvas, CanvasType.TILE, tileId)
}

export function createGridMouseHandlers(
  tools: TileGridController,
  canvas: Readonly<ShallowRef<HTMLCanvasElement | null>>,
) {
  return createTileGridMouseHandlers(tools, canvas, CanvasType.GRID)
}

function createTileGridMouseHandlers<L>(
  tools: TileGridController,
  canvas: Readonly<ShallowRef<HTMLCanvasElement | null>>,
  canvasType: CanvasType,
  tileId?: TileId,
): BaseToolMouseHandlers {
  const state = tools.state

  return {
    handleMouseDown: (e: MouseEvent): void => {
      const { x, y } = getCanvasCoords(canvas.value!, state.scale, e)
      tools.onMouseDown(x, y, canvasType, tileId)
    },
    handleMouseMove: (e: MouseEvent): void => {
      const { x, y } = getCanvasCoords(canvas.value!, state.scale, e)
      tools.onMouseMove(x, y, canvasType, tileId)
    },
    handleMouseUp: (e: MouseEvent): void => {
      const { x, y } = getCanvasCoords(canvas.value!, state.scale, e)
      tools.onMouseUp(x, y, canvasType, tileId)
    },
    handleMouseLeave: (): void =>
      tools.onMouseLeave(canvasType, tileId),
  }
}
