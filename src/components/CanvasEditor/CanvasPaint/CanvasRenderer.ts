import { makePixelCanvas, type PixelCanvas } from '../../../lib/util/html-dom/PixelCanvas.ts'
import { makeCanvasFrameRenderer, makeRenderQueue } from '../../../lib/util/html-dom/renderCanvasFrame.ts'
import { type PixelGridLineRenderer } from '../_core/renderers/PixelGridLineRenderer.ts'
import type { CanvasPaintEditorState } from './CanvasPaintEditorState.ts'
import type { CanvasPaintToolset } from './CanvasPaintToolset.ts'

export type CanvasRenderer = ReturnType<typeof makeCanvasRenderer>

export function makeCanvasRenderer(
  {
    state,
    getImageData,
    gridCache,
  }: {
    state: CanvasPaintEditorState,
    getImageData: () => ImageData,
    gridCache: PixelGridLineRenderer
  }) {

  const renderCanvasFrame = makeCanvasFrameRenderer()
  let toolset: CanvasPaintToolset
  let pixelCanvas: PixelCanvas | undefined

  function setCanvas(canvas: HTMLCanvasElement) {
    pixelCanvas = makePixelCanvas(canvas)
    resize()
    queueRender()
  }

  function resize() {
    pixelCanvas!.resize(state.scaledWidth, state.scaledHeight)
  }

  const queueRender = makeRenderQueue(() => {
    renderCanvasFrame(
      pixelCanvas!,
      state.scale,
      getImageData,
      (ctx) => {
        toolset.currentToolHandler.pixelOverlayDraw?.(ctx)
      },
      (ctx) => {
        if (state.shouldDrawGrid()) {
          gridCache!.draw(ctx)
        }

        toolset.currentToolHandler.screenOverlayDraw?.(ctx)
      },
    )
  })

  function clear() {
    const canvas = pixelCanvas!.canvas!
    pixelCanvas?.ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  return {
    resize,
    queueRender,
    setToolset(val: CanvasPaintToolset) {
      toolset = val
    },
    setCanvas,
    clear,
  }
}
