import type { Position } from '../../../lib/pipeline/_types.ts'

export function getCanvasCoords(canvas: HTMLCanvasElement, scale: number, e: MouseEvent): Position {
  const rect = canvas.getBoundingClientRect()
  return {
    x: Math.floor((e.clientX - rect.left) / scale),
    y: Math.floor((e.clientY - rect.top) / scale),
  }
}