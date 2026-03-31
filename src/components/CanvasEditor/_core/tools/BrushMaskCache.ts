import { type CircleBrushBinaryMask, makeCircleBrushBinaryMask } from 'pixel-data-js'
import { watchEffect } from 'vue'
import { useCanvasEditToolStore } from '../../../../lib/store/canvas-edit-tool-store.ts'
import { BrushShape } from '../_core-editor-types.ts'

const CACHE = {
  mask: null as CircleBrushBinaryMask | null,
}

export function useBrushMaskCache() {
  const canvasStore = useCanvasEditToolStore()

  let lastBrushSize = 0
  if (!CACHE.mask) {
    watchEffect(() => {
      if (canvasStore.brushShape !== BrushShape.CIRCLE) return
      if (canvasStore.brushSize === lastBrushSize) return
      CACHE.mask = makeCircleBrushBinaryMask(canvasStore.brushSize)
      lastBrushSize = canvasStore.brushSize
    })
  }

  return CACHE as {
    mask: CircleBrushBinaryMask
  }
}