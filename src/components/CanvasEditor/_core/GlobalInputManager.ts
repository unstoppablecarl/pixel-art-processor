import { ref, type Ref, type ShallowRef } from 'vue'
import type { Optional } from '../../../lib/_helpers.ts'
import type { Position } from '../../../lib/pipeline/_types.ts'
import type { InputTarget, ToolInputHandlers } from './_core-editor-types.ts'
import { makeGetCurrentCursorCssClass } from './controller/CurrentCursorCssClass.ts'
import type { Toolset } from './Toolset.ts'

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

  function handleGlobalMove(e: MouseEvent) {
    if (!activeTarget) return
    const { x, y } = activeTarget.getCoordsFromEvent(e)
    activeTarget.onMouseMove(x, y, e)
  }

  function handleGlobalUp(e: MouseEvent) {
    if (!activeTarget) return
    const { x, y } = activeTarget.getCoordsFromEvent(e)
    activeTarget.onMouseUp(x, y, e)
    activeTarget = null
    detachGlobal()
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
    cut(target: InputTarget, e: ClipboardEvent) {
      target?.onCut?.(e)
    },
    copy(target: InputTarget, e: ClipboardEvent) {
      target?.onCopy?.(e)
    },
    paste(target: InputTarget, e: ClipboardEvent) {
      target?.onPaste?.(e)
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
    handleCut: (e: ClipboardEvent) => globalInputManager.cut(target, e),
    handleCopy: (e: ClipboardEvent) => globalInputManager.copy(target, e),
    handlePaste: (e: ClipboardEvent) => globalInputManager.paste(target, e),
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
    onCut(e) {
      toolset.currentToolHandler?.onCut?.(e)
    },
    onCopy(e) {
      toolset.currentToolHandler?.onCopy?.(e)
    },
    onPaste(e) {
      toolset.currentToolHandler?.onPaste?.(e)
    },
    ...input,
  })

  return {
    ...globalInput,
    currentCursorCssClass,
  }
}