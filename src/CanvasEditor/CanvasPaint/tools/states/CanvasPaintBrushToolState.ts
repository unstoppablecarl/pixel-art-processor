import { MaskType } from '../../../../../../pixel-data-js/src'
import { type CanvasEditToolStore } from '../../../../lib/store/canvas-edit-tool-store.ts'
import { useBrush } from '../../../_core/data/Brush.ts'
import type { CanvasRenderer } from '../../CanvasRenderer.ts'
import type { CanvasPaintWriter } from '../../data/CanvasPaintWriter.ts'

export type CanvasPaintBrushToolState = ReturnType<typeof makeCanvasPaintBrushToolState>

export function makeCanvasPaintBrushToolState(
  {
    canvasWriter,
    canvasRenderer,
    store,
  }: {
    canvasWriter: CanvasPaintWriter,
    canvasRenderer: CanvasRenderer,
    store: CanvasEditToolStore,
  }) {

  const brush = useBrush()

  function write(
    x: number,
    y: number,
    x2: number = x,
    y2: number = y,
  ) {
    const color = store.brushColor32
    const buffer = canvasWriter.paintBuffer
    let changed = false

    if (brush.data) {
      if (brush.type === MaskType.BINARY) {
        changed = buffer.paintBinaryMask(color, brush, x, y, x2, y2)
      } else {
        changed = buffer.paintAlphaMask(color, brush, x, y, x2, y2)
      }
    } else {
      changed = buffer.paintRect(color, brush, x, y, x2, y2)
    }
    canvasRenderer.queueRender()

    if (changed) {
      canvasRenderer.queueRender()
    }
  }

  return {
    write,
    commit: () => {
      canvasWriter.paintBufferCommit()
      canvasRenderer.queueRender()
    },
  }
}

