import { makePixelCanvas, type PixelCanvas } from '../../../lib/util/html-dom/PixelCanvas.ts'
import { makeRenderQueue, renderCanvasFrame } from '../_support/canvas-frame.ts'
import { type PixelGridLineRenderer } from '../_support/PixelGridLineRenderer.ts'
import type { CanvasPaintEditorState } from './CanvasPaintEditorState.ts'
import type { CurrentToolRenderer } from './CurrentToolRenderer.ts'

export type CanvasRenderer = ReturnType<typeof makeCanvasRenderer>

export function makeCanvasRenderer(
  {
    state,
    getImageData,
  }: {
    state: CanvasPaintEditorState,
    getImageData: () => ImageData,
  }) {

  let currentToolRenderer: CurrentToolRenderer
  let pixelCanvas: PixelCanvas | undefined
  let gridCache: PixelGridLineRenderer | undefined

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
      pixelCanvas,
      state.scale,
      getImageData,
      (ctx) => {
        currentToolRenderer.pixelOverlayDraw(ctx)
      },
      (ctx) => {
        if (state.shouldDrawGrid) {
          gridCache!.draw(ctx)
        }

        currentToolRenderer.screenOverlayDraw(ctx)
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
    setCurrentToolRenderer(val: CurrentToolRenderer) {
      currentToolRenderer = val
    },
    setPixelGridLineRenderer(val: PixelGridLineRenderer) {
      gridCache = val
    },
    setCanvas,
    clear,
  }
}
