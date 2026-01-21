export type Tool = 'pencil' | 'line' | 'select' | 'move'

export type BrushShape = 'circle' | 'square'
export type EditorState = ReturnType<typeof makeEditorState>

export function makeEditorState() {

  return {
    width: 64,
    height: 64,
    scale: 8,

    cursorX: 0,
    cursorY: 0,
    mouseIsOver: false,
    isDrawing: false,
    lastX: 0,
    lastY: 0,

    imageData: null as ImageData | null,

    tool: 'pencil' as Tool,
    brushSize: 1,
    brushShape: 'circle' as BrushShape,

    gridColor: 'rgba(0, 0, 0, 0.2)',
    cursorColor: 'rgba(0, 255, 255, 1)',

    get scaledWidth() {
      return this.scale * this.width
    },

    get scaledHeight() {
      return this.scale * this.height
    },

    selection: null as { x: number; y: number; w: number; h: number } | null,

    externalDraw: null as ((ctx: CanvasRenderingContext2D) => void) | null,

    emitSetPixels: null as ((pixels: { x: number; y: number }[]) => void) | null,
  }
}
