import {
  makeCirclePaintBinaryMask,
  makePaintCursorRenderer,
  makePaintRect,
  type PaintBrush,
  type PaintCursorRenderer,
} from 'pixel-data-js'
import { readonly, type Ref, ref, watchEffect } from 'vue'
import { useCanvasEditToolStore } from '../../../../lib/store/canvas-edit-tool-store.ts'
import { useUIStore } from '../../../../lib/store/ui-store.ts'
import { BrushShape } from '../_core-editor-types.ts'

let initialized = false

let BRUSH: PaintBrush = null as any

let CURSOR: PaintCursorRenderer & {
  watchTarget: Readonly<Ref<number>>
} = null as any

function init() {
  if (initialized) return
  const uiStore = useUIStore()
  const canvasStore = useCanvasEditToolStore()

  const version = ref(0)

  CURSOR = {
    ...makePaintCursorRenderer(),
    watchTarget: readonly(version),
  }

  watchEffect(() => {
    const size = canvasStore.brushSize
    const color = canvasStore.cursorColor32
    const scale = uiStore.imgScale

    if (canvasStore.brushShape === BrushShape.CIRCLE) {
      BRUSH = makeCirclePaintBinaryMask(size)
    } else {
      BRUSH = makePaintRect(size, size)
    }
    CURSOR.update(BRUSH, scale, color)
  })

  initialized = true
}

export function useBrush() {
  init()
  return BRUSH
}

export function useBrushCursor() {
  init()
  return CURSOR
}
