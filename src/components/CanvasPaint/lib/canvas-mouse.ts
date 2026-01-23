import type { ShallowRef } from 'vue'
import type { Point } from '../../../lib/node-data-types/BaseDataStructure.ts'
import type { Position } from '../../../lib/pipeline/_types.ts'
import type { LocalToolManager } from '../LocalToolManager.ts'

export function createMouseHandlers(
  tools: LocalToolManager,
  canvas: Readonly<ShallowRef<HTMLCanvasElement | null>>,
  transformMouseCoords?: (point: Point) => Point,
) {
  const state = tools.state

  function getCanvasCoords(e: MouseEvent): Position {
    const rect = canvas.value!.getBoundingClientRect()
    const pos = {
      x: Math.floor((e.clientX - rect.left) / state.scale),
      y: Math.floor((e.clientY - rect.top) / state.scale),
    }

    return transformMouseCoords?.(pos) ?? pos
  }

  return {
    handleMouseDown: (e: MouseEvent): void => {
      const { x, y } = getCanvasCoords(e)
      tools.onMouseDown(x, y)
    },
    handleMouseMove: (e: MouseEvent): void => {
      const { x, y } = getCanvasCoords(e)
      tools.onMouseMove(x, y)
    },
    handleMouseUp: (e: MouseEvent): void => {
      const { x, y } = getCanvasCoords(e)
      tools.onMouseUp(x, y)
    },
    handleMouseLeave: (): void => tools.onMouseLeave(),
  }
}