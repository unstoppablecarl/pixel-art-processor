import hotkeys from 'hotkeys-js'
import { ref, type Ref, type ShallowRef } from 'vue'
import type { Optional } from '../../../lib/_helpers.ts'
import { COPY_KEYS, PASTE_KEYS } from '../../../lib/key-bindings.ts'
import type { Position } from '../../../lib/pipeline/_types.ts'
import type { InputTarget, ToolInputHandlers } from './_core-editor-types.ts'
import { makeGetCurrentCursorCssClass } from './controller/CurrentCursorCssClass.ts'
import type { Toolset } from './Toolset.ts'

export function makeGlobalInputManager() {
  let activeTarget: InputTarget | null = null
  let lastTarget: InputTarget | null = null

  // unbind in case of hmr
  hotkeys.unbind(COPY_KEYS, handleCopy)
  hotkeys.unbind(PASTE_KEYS, handlePaste)
  detachGlobal()

  hotkeys(COPY_KEYS, handleCopy)
  hotkeys(PASTE_KEYS, handlePaste)

  function attachGlobal() {
    window.addEventListener('mousemove', handleGlobalMove)
    window.addEventListener('mouseup', handleGlobalUp)
  }

  function detachGlobal() {
    window.removeEventListener('mousemove', handleGlobalMove)
    window.removeEventListener('mouseup', handleGlobalUp)
  }

  function handleGlobalMove(e: MouseEvent) {
    if (!activeTarget) return
    const { x, y } = activeTarget.getCoordsFromEvent(e)
    activeTarget.onMouseMove(x, y, e)
  }

  function handleGlobalUp(e: MouseEvent) {
    if (!activeTarget) return
    const { x, y } = activeTarget.getCoordsFromEvent(e)
    activeTarget.onMouseUp(x, y, e)
    lastTarget = activeTarget
    activeTarget = null
    detachGlobal()
  }

  function handleCopy() {
    const target = activeTarget ?? lastTarget
    target?.onCopy?.()
  }

  function handlePaste() {
    const target = activeTarget ?? lastTarget
    target?.onPaste?.()
  }

  return {
    beginInteraction(target: InputTarget, e: MouseEvent) {
      const { x, y } = target.getCoordsFromEvent(e)
      activeTarget = target
      target.onHoverStart?.(e)
      target.onMouseDown(x, y, e)
      attachGlobal()
    },
    hover(target: InputTarget, e: MouseEvent) {
      if (activeTarget) return
      const { x, y } = target.getCoordsFromEvent(e)
      target.onHoverStart?.(e)
      target.onMouseMove(x, y, e)
    },
    enter(target: InputTarget, e: MouseEvent) {
      if (activeTarget === target) return
      target.onHoverStart?.(e)
      target.onMouseEnter?.(e)
    },
    leave(target: InputTarget, e: MouseEvent) {
      if (activeTarget === target) return
      target.onHoverEnd?.(e)
      target.onMouseLeave?.(e)
    },
  }
}

export const globalInputManager = makeGlobalInputManager()

export function useGlobalInput(target: InputTarget): ToolInputHandlers {
  return {
    handleMouseDown: (e: MouseEvent) => globalInputManager.beginInteraction(target, e),
    handleMouseMove: (e: MouseEvent) => globalInputManager.hover(target, e),
    handleMouseLeave: (e: MouseEvent) => globalInputManager.leave(target, e),
    handleMouseEnter: (e: MouseEvent) => globalInputManager.enter(target, e),
  }
}

export function canvasCoordGetter(canvas: Readonly<ShallowRef<HTMLCanvasElement | null>>, scale: Ref<number>) {
  return (e: MouseEvent): Position => {
    const rect = canvas.value!.getBoundingClientRect()
    return {
      x: Math.floor((e.clientX - rect.left) / scale.value),
      y: Math.floor((e.clientY - rect.top) / scale.value),
    }
  }
}

export function makeBaseInputHandlers(
  {
    toolset,
    canvas,
    scale,
    input,
  }: {
    toolset: Toolset<any>,
    canvas: Readonly<ShallowRef<HTMLCanvasElement | null>>,
    scale: Ref<number>,
    input: Optional<InputTarget, 'getCoordsFromEvent' | 'onHoverStart' | 'onHoverEnd' | 'onCopy' | 'onPaste'>,
  },
) {

  const currentCursorCssClass = ref<string | null>(null)
  const getCurrentCursorClass = makeGetCurrentCursorCssClass(toolset)

  const globalInput = useGlobalInput({
    getCoordsFromEvent: canvasCoordGetter(canvas, scale),
    onHoverStart() {
      currentCursorCssClass.value = getCurrentCursorClass()
    },
    onHoverEnd() {
      currentCursorCssClass.value = null
    },
    onCopy() {
      toolset.currentToolHandler?.onCopy?.()
    },
    onPaste() {
      toolset.currentToolHandler?.onPaste?.()
    },
    ...input,
  })

  return {
    ...globalInput,
    currentCursorCssClass,
  }
}