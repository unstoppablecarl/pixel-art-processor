import type { ShallowRef } from 'vue'
import type { BaseToolMouseHandlers } from '../../_core-editor-types.ts'
import { getCanvasCoords } from '../../_support/misc.ts'
import type { CanvasPaintController } from '../CanvasPaintController.ts'

export function createCanvasPaintMouseHandlers<L>(
  tools: CanvasPaintController,
  canvas: Readonly<ShallowRef<HTMLCanvasElement | null>>,
): BaseToolMouseHandlers {
  const state = tools.state

  return {
    handleMouseDown: (e: MouseEvent): void => {
      const { x, y } = getCanvasCoords(canvas.value!, state.scale, e)
      tools.onMouseDown(x, y)
    },
    handleMouseMove: (e: MouseEvent): void => {
      const { x, y } = getCanvasCoords(canvas.value!, state.scale, e)
      tools.onMouseMove(x, y)
    },
    handleMouseUp: (e: MouseEvent): void => {
      const { x, y } = getCanvasCoords(canvas.value!, state.scale, e)
      tools.onMouseUp(x, y)
    },
    handleMouseLeave: (): void => tools.onMouseLeave(),
  }
}