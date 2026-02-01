import type { Point } from '../../../lib/node-data-types/BaseDataStructure.ts'
import { useGlobalToolContext } from '../../../lib/store/canvas-edit-tool-store.ts'
import { getPerfectCircleCoords, getRectCenterCoords } from '../../../lib/util/data/Grid.ts'
import { setImageDataPixelColor } from '../../../lib/util/html-dom/ImageData.ts'
import { type BaseEditorState, BrushShape } from '../_core-editor-types.ts'

export type BrushToolState = ReturnType<typeof makeBrushToolState>

export function makeBrushToolState(
  {
    state,
  }: {
    state: BaseEditorState,
  }) {

  const globalContext = useGlobalToolContext()

  function getBrushPixels(
    x: number,
    y: number,
    boundsWidth: number,
    boundsHeight: number,
  ): Point[] {
    const { brushSize, brushShape } = globalContext
    const w = boundsWidth
    const h = boundsHeight

    if (brushShape === BrushShape.CIRCLE) {
      return getPerfectCircleCoords(x, y, brushSize * 0.5, w, h)
    } else {
      return getRectCenterCoords(x, y, brushSize, brushSize, w, h)
    }
  }

  function writeBrushPixels(
    target: ImageData,
    x: number,
    y: number,
    boundsWidth: number,
    boundsHeight: number,
  ) {
    const pixels = getBrushPixels(x, y, boundsWidth, boundsHeight)
    for (const p of pixels) {
      setImageDataPixelColor(target, p.x, p.y, globalContext.brushColor)
    }
  }

  return {
    getBrushPixels,
    writeBrushPixels,
  }
}

