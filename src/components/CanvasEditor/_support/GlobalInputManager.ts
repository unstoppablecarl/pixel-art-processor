import type { ShallowRef } from 'vue'
import type { Position } from '../../../lib/pipeline/_types.ts'
import type { InputTarget, ToolInputHandlers } from '../_core-editor-types.ts'

export function makeGlobalInputManager() {
  let activeTarget: InputTarget | null = null

  function attachGlobal() {
    window.addEventListener('mousemove', handleGlobalMove)
    window.addEventListener('mouseup', handleGlobalUp)
  }

  function detachGlobal() {
    window.removeEventListener('mousemove', handleGlobalMove)
    window.removeEventListener('mouseup', handleGlobalUp)
  }

  function beginInteraction(target: InputTarget, e: MouseEvent) {
    const { x, y } = target.getCoordsFromEvent(e)
    activeTarget = target
    target.onHoverStart?.()
    target.onMouseDown(x, y)
    attachGlobal()
  }

  function handleGlobalMove(e: MouseEvent) {
    if (!activeTarget) return
    const { x, y } = activeTarget.getCoordsFromEvent(e)
    activeTarget.onMouseMove(x, y)
  }

  function handleGlobalUp(e: MouseEvent) {
    if (!activeTarget) return
    const { x, y } = activeTarget.getCoordsFromEvent(e)
    activeTarget.onMouseUp(x, y)
    activeTarget = null
    detachGlobal()
  }

  function hover(target: InputTarget, e: MouseEvent) {
    if (activeTarget) return
    const { x, y } = target.getCoordsFromEvent(e)
    target.onHoverStart?.()
    target.onMouseMove(x, y)
  }

  function enter(target: InputTarget) {
    if (activeTarget === target) return
    target.onHoverStart?.()
    target.onMouseEnter?.()
  }

  function leave(target: InputTarget) {
    if (activeTarget === target) return
    target.onHoverEnd?.()
    target.onMouseLeave?.()
  }

  return { beginInteraction, hover, leave, enter }
}

export const globalInputManager = makeGlobalInputManager()

export function useGlobalInput(target: InputTarget): ToolInputHandlers {
  return {
    handleMouseDown: (e: MouseEvent) => globalInputManager.beginInteraction(target, e),
    handleMouseMove: (e: MouseEvent) => globalInputManager.hover(target, e),
    handleMouseLeave: () => globalInputManager.leave(target),
    handleMouseEnter: () => globalInputManager.enter(target),
  }
}

export function canvasCoordGetter(canvas: Readonly<ShallowRef<HTMLCanvasElement | null>>, scale: number) {
  return (e: MouseEvent): Position => {
    const rect = canvas.value!.getBoundingClientRect()
    return {
      x: Math.floor((e.clientX - rect.left) / scale),
      y: Math.floor((e.clientY - rect.top) / scale),
    }
  }
}
