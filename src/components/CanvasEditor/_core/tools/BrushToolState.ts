import type { Point } from '../../../../lib/node-data-types/BaseDataStructure.ts'
import { useCanvasEditToolStore } from '../../../../lib/store/canvas-edit-tool-store.ts'
import { getPerfectCircleCoords, getRectCenterCoords } from '../../../../lib/util/data/Grid.ts'
import { setImageDataPixelColor } from '../../../../lib/util/html-dom/ImageData.ts'
import { type BaseEditorState, BrushShape } from '../_core-editor-types.ts'

export type BrushToolState = ReturnType<typeof makeBrushToolState>

export function makeBrushToolState(
  {
    state,
  }: {
    state: BaseEditorState,
  }) {

  const store = useCanvasEditToolStore()

  function getBrushPixels(
    x: number,
    y: number,
    boundsWidth: number,
    boundsHeight: number,
  ): Point[] {
    const { brushSize, brushShape } = store
    const w = boundsWidth
    const h = boundsHeight

    if (brushShape === BrushShape.CIRCLE) {
      return getPerfectCircleCoords(x, y, brushSize, w, h)
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
      setImageDataPixelColor(target, p.x, p.y, store.brushColor)
    }
  }

  return {
    get brushSize() {
      return store.brushSize
    },
    getBrushPixels,
    writeBrushPixels,
  }
}

