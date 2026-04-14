import { destinationOutPerfect, MaskType, packColor } from '../../../../../../pixel-data-js/src'
import { type CanvasEditToolStore } from '../../../../lib/store/canvas-edit-tool-store.ts'
import { SubTools, Tool } from '../../../_core/_core-editor-types.ts'
import { useBrush } from '../../../_core/data/Brush.ts'
import type { CanvasRenderer } from '../../CanvasRenderer.ts'
import type { CanvasPaintWriter } from '../../data/CanvasPaintWriter.ts'

export type CanvasPaintBrushToolState = ReturnType<typeof makeCanvasPaintBrushToolState>
const ERASE = packColor(255, 0, 0, 255)

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
    const buffer = canvasWriter.paintBuffer
    let changed: boolean

    const eraseMode = store.currentSubTool === SubTools[Tool.BRUSH].REMOVE
    const color = eraseMode ? ERASE : store.brushColor

    if (brush.data) {
      if (brush.type === MaskType.BINARY) {
        changed = buffer.paintBinaryMask(color, brush, x, y, x2, y2)
      } else {
        changed = buffer.paintAlphaMask(color, brush, x, y, x2, y2)
      }
    } else {
      changed = buffer.paintRect(color, brush, x, y, x2, y2)
    }

    if (changed) {
      canvasRenderer.queueRender()
    }
  }

  return {
    write,
    draw(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) {
      if (store.currentSubTool === SubTools[Tool.BRUSH].REMOVE) {
        canvasWriter.paintBufferRenderer.draw(ctx, 255, 'destination-out')
      } else {
        canvasWriter.paintBufferRenderer.draw(ctx)
      }
    },
    commit() {
      if (store.currentSubTool === SubTools[Tool.BRUSH].REMOVE) {
        canvasWriter.paintBufferCommit(255, destinationOutPerfect)
      } else {
        canvasWriter.paintBufferCommit()
      }
      canvasRenderer.queueRender()
    },
  }
}

